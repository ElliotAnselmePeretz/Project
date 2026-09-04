/**
 * Grouping and streak maths for deadlines. Pure — no database, no React — so
 * the awkward cases (midnight boundaries, gaps in a streak) can be tested
 * directly rather than through the UI.
 */

export type Bucket = "overdue" | "today" | "tomorrow" | "week" | "later";

export const BUCKET_LABELS: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This week",
  later: "Later",
};

export const BUCKET_ORDER: Bucket[] = ["overdue", "today", "tomorrow", "week", "later"];

/** Local-midnight start of the day containing `d`. */
export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Whole days from the start of `from`'s day to the start of `to`'s day. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function bucketFor(dueAt: Date, now: Date = new Date()): Bucket {
  const days = daysBetween(now, dueAt);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "week";
  return "later";
}

/**
 * Consecutive days ending today (or yesterday) on which something was
 * completed. Finishing yesterday but not yet today keeps the streak alive —
 * it should not break until a day is actually missed.
 */
export function streakFrom(completedAt: Date[], now: Date = new Date()): number {
  if (completedAt.length === 0) return 0;

  const days = new Set(completedAt.map((d) => startOfDay(d).getTime()));
  const today = startOfDay(now).getTime();
  const DAY = 86_400_000;

  // Start from today if it counts, else yesterday; otherwise the streak is over.
  let cursor = days.has(today) ? today : days.has(today - DAY) ? today - DAY : null;
  if (cursor === null) return 0;

  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor -= DAY;
  }
  return count;
}

/** Titles are user input: trim, cap, and refuse an empty one. */
export function cleanTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ").slice(0, 140);
  return trimmed.length > 0 ? trimmed : null;
}
