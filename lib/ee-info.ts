/**
 * Reference notes on what the extended essay actually requires.
 *
 * Deliberately EMPTY until real content is supplied. Requirements shift
 * between syllabus versions and sessions, and schools brief differently, so
 * a plausible-looking guess would be worse than an honest blank — a student
 * would trust it. Fill this from a real brief or syllabus.
 *
 * Mirrors lib/ia-info.ts, which does the same job per subject.
 */
export interface EeInfo {
  /** What the task is, in a sentence. */
  format?: string;
  /** Length requirement, exactly as the brief words it. */
  length?: string;
  /** How it is marked — criteria and total marks. */
  assessed?: string;
  /** What the supervisor is and is not allowed to do. */
  supervision?: string;
  /** Anything else worth knowing: rules, required elements, common mistakes. */
  notes?: string[];
  /** Where the official version lives. */
  source?: { label: string; href: string };
}

export const EE_INFO: EeInfo = {
  // e.g. format: "…", length: "…", assessed: "…", notes: ["…"],
};

/** True once anything real has been written in. */
export function hasEeInfo(): boolean {
  return Object.keys(EE_INFO).length > 0;
}
