/**
 * Reference notes about what each subject's internal assessment actually is.
 *
 * Keyed by subject name rather than group number on purpose: Biology and
 * Chemistry are both Group 4, but their investigations are not the same task.
 *
 * This is deliberately EMPTY until real content is supplied. Requirements
 * differ by subject, syllabus version and session, so a plausible-looking
 * guess would be worse than an honest blank — a student would trust it. Add
 * entries here only from a real brief or syllabus.
 */
export interface IaInfo {
  /** What the task is, in a sentence. */
  format?: string;
  /** Length requirement, exactly as the brief words it. */
  length?: string;
  /** How it is marked — criteria and total marks. */
  assessed?: string;
  /** Anything else worth knowing: rules, common mistakes, required elements. */
  notes?: string[];
  /** Where the official version lives. */
  source?: { label: string; href: string };
}

export const IA_INFO: Record<string, IaInfo> = {
  // e.g. "Biology": { format: "…", length: "…", assessed: "…", notes: ["…"] },
};

export function iaInfoFor(subjectName: string): IaInfo | null {
  return IA_INFO[subjectName] ?? null;
}

export function hasIaInfo(subjectName: string): boolean {
  return iaInfoFor(subjectName) !== null;
}
