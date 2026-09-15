/**
 * Reference notes on what TOK requires, per component.
 *
 * EMPTY on purpose, like lib/ia-info.ts and lib/ee-info.ts. Requirements shift
 * between syllabus versions and sessions, so a plausible-looking guess would be
 * worse than an honest blank — a student would trust it. Fill from a real brief.
 */
export interface TokComponentInfo {
  format?: string;
  length?: string;
  assessed?: string;
  notes?: string[];
}

export interface TokInfo {
  exhibition?: TokComponentInfo;
  essay?: TokComponentInfo;
  /** Anything covering TOK as a whole. */
  overall?: string[];
  source?: { label: string; href: string };
}

export const TOK_INFO: TokInfo = {
  // e.g. exhibition: { format: "…", length: "…", assessed: "…", notes: ["…"] },
};

export function hasTokInfo(): boolean {
  return Object.keys(TOK_INFO).length > 0;
}
