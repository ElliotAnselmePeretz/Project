import { eq, sql } from "drizzle-orm";
import { db, schema } from "./db";

export type MealSource = "deadline" | "subject-goal" | "work-goal";

/**
 * Award one meal for a completed piece of work.
 *
 * Idempotent by construction: the ledger's primary key is
 * (user, sourceType, sourceId), so a second attempt for the same work inserts
 * nothing and the pet's counter is left alone. Callers can fire this without
 * tracking whether they have already paid out.
 *
 * There is deliberately no refund. Un-completing work does NOT return its
 * meal, because the meal may already have been spent and its XP banked —
 * refunding would let a student toggle one goal to mint unlimited XP. A meal
 * is paid once per piece of work, for good.
 *
 * Returns true only when a meal was actually granted, so the UI can say so.
 */
export async function awardMeal(
  userId: string,
  sourceType: MealSource,
  sourceId: string,
): Promise<boolean> {
  // No pet, no meal — and no ledger row either, so adopting later does not
  // retroactively hand out a backlog of meals for work already finished.
  const [pet] = await db.select().from(schema.pets).where(eq(schema.pets.userId, userId));
  if (!pet) return false;

  const inserted = await db
    .insert(schema.petMeals)
    .values({ userId, sourceType, sourceId, earnedAt: new Date() })
    .onConflictDoNothing()
    .returning({ sourceId: schema.petMeals.sourceId });

  if (inserted.length === 0) return false;

  await db
    .update(schema.pets)
    .set({ meals: sql`${schema.pets.meals} + 1` })
    .where(eq(schema.pets.userId, userId));

  return true;
}
