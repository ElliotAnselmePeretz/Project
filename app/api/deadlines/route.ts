import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rows = await db
    .select()
    .from(schema.deadlines)
    .where(and(eq(schema.deadlines.userId, token.userId), eq(schema.deadlines.dismissed, false)))
    .orderBy(asc(schema.deadlines.dueAt));

  return NextResponse.json({ deadlines: rows });
}

export async function PATCH(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, dismissed } = await req.json();
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  // Scope the update by userId so an id from another account cannot be touched.
  const updated = await db
    .update(schema.deadlines)
    .set({ dismissed: Boolean(dismissed) })
    .where(
      and(
        eq(schema.deadlines.id, id),
        eq(schema.deadlines.userId, token.userId),
        // Only a deadline that is currently open can be completed, so repeatedly
        // toggling one cannot farm meals.
        eq(schema.deadlines.dismissed, false),
      ),
    )
    .returning({ id: schema.deadlines.id });

  let mealEarned = false;
  if (dismissed && updated.length > 0) {
    const fed = await db
      .update(schema.pets)
      .set({ meals: sql`${schema.pets.meals} + 1` })
      .where(eq(schema.pets.userId, token.userId))
      .returning({ userId: schema.pets.userId });
    mealEarned = fed.length > 0;
  }

  return NextResponse.json({ ok: true, mealEarned });
}
