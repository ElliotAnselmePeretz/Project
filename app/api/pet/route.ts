import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";
import { SPECIES, currentHunger, feed, levelFromXp, levelProgress, moodFor, type Species } from "@/lib/pets";

/** Shape sent to the client: stored values plus everything derived from time. */
function present(pet: typeof schema.pets.$inferSelect) {
  const hunger = currentHunger(pet.hunger, pet.lastFedAt);
  return {
    species: pet.species,
    name: pet.name,
    hunger: Math.round(hunger),
    mood: moodFor(hunger),
    xp: pet.xp,
    level: levelFromXp(pet.xp),
    progress: levelProgress(pet.xp),
    meals: pet.meals,
    hidden: pet.hidden,
  };
}

async function requireUser(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  return token?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [pet] = await db.select().from(schema.pets).where(eq(schema.pets.userId, userId));
  return NextResponse.json({ pet: pet ? present(pet) : null });
}

/** Adopt a pet. */
export async function POST(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { species, name } = await req.json();
  if (!SPECIES.includes(species as Species)) {
    return NextResponse.json({ error: "Unknown species" }, { status: 400 });
  }

  const trimmed = typeof name === "string" ? name.trim().slice(0, 24) : "";
  const [pet] = await db
    .insert(schema.pets)
    .values({
      userId,
      species: species as Species,
      name: trimmed || "Buddy",
      hunger: 100,
      lastFedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.pets.userId,
      // Re-adopting swaps the creature but keeps XP: the work was still done.
      set: { species: species as Species, name: trimmed || "Buddy", hidden: false },
    })
    .returning();

  return NextResponse.json({ pet: present(pet) });
}

/** Feed, rename, or hide. */
export async function PATCH(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const [pet] = await db.select().from(schema.pets).where(eq(schema.pets.userId, userId));
  if (!pet) return NextResponse.json({ error: "No pet yet" }, { status: 404 });

  if (body.action === "feed") {
    // Settle hunger against elapsed time first, or feeding would restore from a
    // stale value and hand out free hunger.
    const settled = currentHunger(pet.hunger, pet.lastFedAt);
    const { state, fed } = feed({ hunger: settled, xp: pet.xp, meals: pet.meals });
    if (!fed) {
      return NextResponse.json({ error: "No meals — complete a deadline to earn one." }, { status: 400 });
    }
    const [updated] = await db
      .update(schema.pets)
      .set({ hunger: state.hunger, xp: state.xp, meals: state.meals, lastFedAt: new Date() })
      .where(eq(schema.pets.userId, userId))
      .returning();
    return NextResponse.json({ pet: present(updated), levelledUp: levelFromXp(state.xp) > levelFromXp(pet.xp) });
  }

  if (body.action === "hide" || body.action === "show") {
    const [updated] = await db
      .update(schema.pets)
      .set({ hidden: body.action === "hide" })
      .where(eq(schema.pets.userId, userId))
      .returning();
    return NextResponse.json({ pet: present(updated) });
  }

  if (body.action === "rename") {
    const trimmed = typeof body.name === "string" ? body.name.trim().slice(0, 24) : "";
    if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    const [updated] = await db
      .update(schema.pets)
      .set({ name: trimmed })
      .where(eq(schema.pets.userId, userId))
      .returning();
    return NextResponse.json({ pet: present(updated) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
