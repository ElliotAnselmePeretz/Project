/**
 * Reference notes on what CAS requires.
 *
 * EMPTY on purpose, like ia-info, ee-info and tok-info. Requirements differ by
 * school and syllabus version — including whether hours are formally required
 * at all — so a plausible-looking guess would be worse than an honest blank.
 * Fill from a real brief.
 */
export interface CasInfo {
  /** What CAS asks of you overall. */
  overview?: string;
  /** How the school expects the strands to balance. */
  balance?: string;
  /** What counts as the CAS project. */
  project?: string;
  /** How it is signed off — interviews, portfolio, evidence. */
  completion?: string;
  notes?: string[];
  source?: { label: string; href: string };
}

export const CAS_INFO: CasInfo = {
  // e.g. overview: "…", balance: "…", project: "…", notes: ["…"],
};

export function hasCasInfo(): boolean {
  return Object.keys(CAS_INFO).length > 0;
}
