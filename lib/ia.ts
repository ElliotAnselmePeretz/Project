// Extension-qualified so `node --test --experimental-strip-types` resolves it.
import { SUBJECT_GROUPS } from "./ib-subjects.ts";

/**
 * What a subject's internal assessment is called.
 *
 * Groups 1 and 2 are assessed orally rather than through a written internal
 * assessment, and the name varies by group, syllabus year and school — IO,
 * IOA and IOC are all in use. So this is a *default*, not a fact: the intent
 * is that a student can rename it per subject, and this only decides what the
 * field starts as.
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
