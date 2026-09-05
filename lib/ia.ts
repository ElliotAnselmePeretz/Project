// Extension-qualified so `node --test --experimental-strip-types` resolves it.
import { SUBJECT_GROUPS } from "./ib-subjects.ts";

/**
 * What a subject's internal assessment is called.
 *
 * Groups 1 and 2 are assessed orally rather than through a written internal
 * assessment, and the name varies by group, syllabus year and school — IO,
 * IOA and IOC are all in use. So this is a *default*, not a fact: a student
 * can rename it per subject, and this only decides what the field starts as.
 */
const ORAL_GROUPS: Set<number> = new Set([1, 2]);

export const WRITTEN_LABEL = "IA";
export const ORAL_LABEL = "IOA";

export function defaultAssessmentLabel(groupNumber: number): string {
  return ORAL_GROUPS.has(groupNumber) ? ORAL_LABEL : WRITTEN_LABEL;
}

export function isOralGroup(groupNumber: number): boolean {
  return ORAL_GROUPS.has(groupNumber);
}

/** Every DP group paired with the label its internal assessment starts as. */
export function assessmentLabelsByGroup(): { groupNumber: number; label: string }[] {
  return SUBJECT_GROUPS.map((g) => ({
    groupNumber: g.number,
    label: defaultAssessmentLabel(g.number),
  }));
}

/* ------------------------------------------------------------------ stages */

export interface StageDef {
  key: string;
  label: string;
}

/**
 * The same six stage *keys* describe both routes, so a stored stage stays
 * valid if a label is ever reworded — only the wording differs, because
 * preparing a timed oral does not look like drafting a written report.
 */
const WRITTEN_STAGES: StageDef[] = [
  { key: "topic", label: "Topic chosen" },
  { key: "approved", label: "Question approved" },
  { key: "work", label: "Data / research" },
  { key: "draft", label: "First draft" },
  { key: "feedback", label: "Teacher feedback" },
  { key: "final", label: "Final submitted" },
];

const ORAL_STAGES: StageDef[] = [
  { key: "topic", label: "Text / extract chosen" },
  { key: "approved", label: "Focus agreed" },
  { key: "work", label: "Outline prepared" },
  { key: "draft", label: "Practised" },
  { key: "feedback", label: "Teacher feedback" },
  { key: "final", label: "Assessed" },
];

export const STAGE_KEYS: string[] = WRITTEN_STAGES.map((s) => s.key);

export function stagesFor(groupNumber: number): StageDef[] {
  return isOralGroup(groupNumber) ? ORAL_STAGES : WRITTEN_STAGES;
}

export function isValidStage(key: unknown): boolean {
  return typeof key === "string" && STAGE_KEYS.includes(key);
}

/** Position in the sequence, or -1 if unknown. Used to draw progress. */
export function stageIndex(key: string | null): number {
  return key === null ? -1 : STAGE_KEYS.indexOf(key);
}

/* ------------------------------------------------------------------ length */

export type LengthUnit = "words" | "minutes";

/** Orals are measured in minutes; written assessments in words. */
export function lengthUnitFor(groupNumber: number): LengthUnit {
  return isOralGroup(groupNumber) ? "minutes" : "words";
}

/**
 * How full the piece is, 0–1, or null when there is no limit to measure
 * against. Deliberately not capped: going over the limit is the thing a
 * student most needs to see.
 */
export function lengthFraction(count: number | null, limit: number | null): number | null {
  if (count == null || limit == null || limit <= 0) return null;
  return count / limit;
}

/* -------------------------------------------------------------- criteria */

export interface CriterionScore {
  maxMark: number;
  selfMark: number | null;
}

export interface CriteriaTotals {
  /** Marks given to criteria that have been scored. */
  scored: number;
  /** Marks available on those same scored criteria. */
  scoredMax: number;
  /** Marks available across every criterion, scored or not. */
  totalMax: number;
  assessedCount: number;
  criterionCount: number;
}

export function criteriaTotals(list: CriterionScore[]): CriteriaTotals {
  let scored = 0;
  let scoredMax = 0;
  let totalMax = 0;
  let assessedCount = 0;

  for (const c of list) {
    totalMax += c.maxMark;
    if (c.selfMark != null) {
      scored += c.selfMark;
      scoredMax += c.maxMark;
      assessedCount++;
    }
  }

  return { scored, scoredMax, totalMax, assessedCount, criterionCount: list.length };
}

export const MAX_CRITERION_MARK = 100;

export function validateCriterion(name: unknown, maxMark: unknown): string | null {
  if (typeof name !== "string" || name.trim().length === 0) return "Give the criterion a name";
  if (name.length > 80) return "That name is too long (80 characters max)";
  if (!Number.isInteger(maxMark) || (maxMark as number) < 1 || (maxMark as number) > MAX_CRITERION_MARK) {
    return `Marks available must be a whole number from 1 to ${MAX_CRITERION_MARK}`;
  }
  return null;
}

export function validateSelfMark(mark: unknown, maxMark: number): string | null {
  if (mark === null) return null; // clearing a score is always allowed
  if (!Number.isInteger(mark) || (mark as number) < 0) return "Mark must be a whole number, 0 or higher";
  if ((mark as number) > maxMark) return `Mark cannot be higher than the ${maxMark} available`;
  return null;
}
