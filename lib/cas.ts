export const CAS_STRANDS = ["creativity", "activity", "service"] as const;
export type CasStrand = (typeof CAS_STRANDS)[number];

export const STRAND_META: Record<CasStrand, { label: string; hint: string }> = {
  creativity: { label: "Creativity", hint: "Arts, and anything involving creative thinking." },
  activity: { label: "Activity", hint: "Physical exertion — sport, training, anything active." },
  service: { label: "Service", hint: "Unpaid work responding to a real community need." },
};

export function isValidStrand(value: unknown): value is CasStrand {
  return typeof value === "string" && (CAS_STRANDS as readonly string[]).includes(value);
}

export interface ActivityInput {
  title: string;
  hours: number;
  strands: string[];
}

export const MAX_HOURS = 10_000;

export function validateActivity(input: ActivityInput): string | null {
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return "Give this activity a name";
  }
  if (input.title.length > 200) return "That name is too long (200 characters max)";

  if (!Number.isFinite(input.hours) || input.hours < 0) return "Hours must be a number, 0 or higher";
  if (input.hours > MAX_HOURS) return "That is more hours than the diploma has";

  if (!Array.isArray(input.strands) || input.strands.length === 0) {
    return "Pick at least one strand";
  }
  if (input.strands.some((s) => !isValidStrand(s))) return "Unknown strand";

  return null;
}

export interface ActivityLike {
  hours: number | null;
  creativity: boolean;
  activity: boolean;
  service: boolean;
}

export interface CasTotals {
  /** Hours per strand. An activity in two strands counts toward both. */
  byStrand: Record<CasStrand, number>;
  /** Every activity's hours, counted once each. */
  totalHours: number;
  activityCount: number;
}

/**
 * Totals for the tracker.
 *
 * A single activity can serve more than one strand — coaching a team is
 * Activity and Service — so its hours count toward each strand it serves,
 * while `totalHours` counts them once. The UI has to say so, or the numbers
 * look like they do not add up.
 */
export function casTotals(activities: ActivityLike[]): CasTotals {
  const byStrand: Record<CasStrand, number> = { creativity: 0, activity: 0, service: 0 };
  let totalHours = 0;

  for (const a of activities) {
    const hours = typeof a.hours === "number" && Number.isFinite(a.hours) ? a.hours : 0;
    totalHours += hours;
    if (a.creativity) byStrand.creativity += hours;
    if (a.activity) byStrand.activity += hours;
    if (a.service) byStrand.service += hours;
  }

  return { byStrand, totalHours, activityCount: activities.length };
}

/** Which strands an activity is tagged with, for showing badges. */
export function strandsOf(a: ActivityLike): CasStrand[] {
  return CAS_STRANDS.filter((s) => a[s]);
}
