import { NextResponse, type NextRequest } from "next/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";
import { cleanTitle } from "@/lib/deadline-utils";

async function requireUser(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  return token?.userId ?? null;
}

/** `?view=completed` returns finished items, newest first; otherwise open ones by due date. */
export async function GET(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const completed = req.nextUrl.searchParams.get("view") === "completed";

  const rows = await db
    .select()
    .from(schema.deadlines)
    .where(and(eq(schema.deadlines.userId, userId), eq(schema.deadlines.dismissed, completed)))
    .orderBy(completed ? desc(schema.deadlines.completedAt) : asc(schema.deadlines.dueAt));

  return NextResponse.json({ deadlines: rows });
}

/** Create a deadline by hand — the only route that does not require a synced source. */
export async function POST(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { title, dueAt, subject, description } = await req.json();

  const cleanedTitle = cleanTitle(title);
  if (!cleanedTitle) return NextResponse.json({ error: "A title is required" }, { status: 400 });

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return NextResponse.json({ error: "That date could not be read" }, { status: 400 });
  }

  const id = `mn_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const [row] = await db
    .insert(schema.deadlines)
    .values({
      id,
      userId,
      title: cleanedTitle,
      description: typeof description === "string" ? description.trim().slice(0, 500) || null : null,
      dueAt: due,
      source: "manual",
      sourceKey: `manual:${id}`,
      subject: typeof subject === "string" && subject ? subject : null,
      confidence: 1,
    })
    .returning();

  return NextResponse.json({ deadline: row });
}

/** Complete, restore, or edit. */
export async function PATCH(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, dismissed, title, dueAt, subject } = await req.json();
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  const scope = and(eq(schema.deadlines.id, id), eq(schema.deadlines.userId, userId));
  const [existing] = await db.select().from(schema.deadlines).where(scope);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // --- edit ---
  if (title !== undefined || dueAt !== undefined || subject !== undefined) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (title !== undefined) {
      const cleaned = cleanTitle(title);
      if (!cleaned) return NextResponse.json({ error: "A title is required" }, { status: 400 });
      patch.title = cleaned;
    }
    if (dueAt !== undefined) {
      const due = new Date(dueAt);
      if (Number.isNaN(due.getTime())) {
        return NextResponse.json({ error: "That date could not be read" }, { status: 400 });
      }
      patch.dueAt = due;
    }
    if (subject !== undefined) patch.subject = subject || null;

    const [row] = await db.update(schema.deadlines).set(patch).where(scope).returning();
    return NextResponse.json({ deadline: row });
  }

  // --- complete / restore ---
  if (typeof dismissed !== "boolean") {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }
  if (existing.dismissed === dismissed) {
    return NextResponse.json({ ok: true, mealEarned: false });
  }

  const [row] = await db
    .update(schema.deadlines)
    .set({ dismissed, completedAt: dismissed ? new Date() : null })
    .where(scope)
    .returning();

  // A meal is paid once per deadline, ever. Restoring and re-completing the
  // same item must not mint another one.
  let mealEarned = false;
  if (dismissed && !existing.mealAwarded) {
    const fed = await db
      .update(schema.pets)
      .set({ meals: sql`${schema.pets.meals} + 1` })
      .where(eq(schema.pets.userId, userId))
      .returning({ userId: schema.pets.userId });

    if (fed.length > 0) {
      await db.update(schema.deadlines).set({ mealAwarded: true }).where(scope);
      mealEarned = true;
    }
  }

  return NextResponse.json({ ok: true, mealEarned, deadline: row });
}

/** Delete — manual items only; synced ones would reappear on the next sync. */
export async function DELETE(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(schema.deadlines)
    .where(and(eq(schema.deadlines.id, id), eq(schema.deadlines.userId, userId)));

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.source !== "manual") {
    return NextResponse.json(
      { error: "Synced deadlines can't be deleted — they'd return on the next sync. Complete it instead." },
      { status: 400 },
    );
  }

  await db.delete(schema.deadlines).where(and(eq(schema.deadlines.id, id), eq(schema.deadlines.userId, userId)));
  return NextResponse.json({ ok: true });
}
