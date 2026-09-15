// Extension-qualified so `node --test --experimental-strip-types` can resolve
// this too; the bundler is happy either way.
import { SUBJECT_GROUPS } from "./ib-subjects.ts";

/** IB awards each subject a grade from 1 to 7. */
export const MIN_GRADE = 1;
export const MAX_GRADE = 7;

const VALID_GROUPS: Set<number> = new Set(SUBJECT_GROUPS.map((g) => g.number));

export function isValidGroup(groupNumber: number): boolean {
  return VALID_GROUPS.has(groupNumber);
}

export interface AssessmentInput {
  title: string;
  mark: number;
  maxMark: number;
  /** Optional weighting toward the average. Unweighted entries count as 1. */
  weight?: number | null;
}

export function validateAssessment(a: AssessmentInput): string | null {
  if (typeof a.title !== "string" || a.title.trim().length === 0) return "Give this assessment a name";
  if (a.title.length > 120) return "That name is too long (120 characters max)";
  if (!Number.isFinite(a.mark) || a.mark < 0) return "Mark must be a number, 0 or higher";
  if (!Number.isFinite(a.maxMark) || a.maxMark <= 0) return "Marks available must be greater than 0";
  if (a.mark > a.maxMark) return `Mark cannot be higher than the ${a.maxMark} available`;
  if (a.weight != null && (!Number.isFinite(a.weight) || a.weight <= 0)) {
    return "Weight must be greater than 0";
  }
  return null;
}

export function validateTargetGrade(grade: number): string | null {
  if (!Number.isInteger(grade) || grade < MIN_GRADE || grade > MAX_GRADE) {
    return `Target grade must be a whole number from ${MIN_GRADE} to ${MAX_GRADE}`;
  }
  return null;
}

export function validateText(value: unknown, field: string, max: number): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return `${field} cannot be empty`;
  if (value.length > max) return `${field} is too long (${max} characters max)`;
  return null;
}

export interface ScoredAssessment {
  mark: number;
  maxMark: number;
  weight?: number | null;
}

/** A single assessment as a percentage, or null if it cannot be scored. */
export function percentOf(mark: number, maxMark: number): number | null {
  if (!Number.isFinite(mark) || !Number.isFinite(maxMark) || maxMark <= 0) return null;
  return (mark / maxMark) * 100;
}

/**
 * Weighted mean of a set of assessments, as a percentage.
 *
 * Entries without a weight count once. Returns null when there is nothing
 * scoreable, so callers show "no marks yet" rather than a misleading 0%.
 */
export function averagePercent(list: ScoredAssessment[]): number | null {
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const a of list) {
    const pct = percentOf(a.mark, a.maxMark);
    if (pct === null) continue;
    const weight = a.weight != null && a.weight > 0 ? a.weight : 1;
    weightedTotal += pct * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return null;
  return weightedTotal / weightTotal;
}
