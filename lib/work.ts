/**
 * Goals and notes exist in several places that are not subjects — the extended
 * essay, TOK, CAS. Rather than one pair of tables per area, they share a
 * `scope` string, so adding an area later is a route, not a migration.
 *
 * Subject goals and notes predate this and still live in their own tables. If
 * those are ever folded in, "subject:4" is the scope shape to use.
 */
export const WORK_SCOPES = ["ee", "tok", "cas"] as const;
export type WorkScope = (typeof WORK_SCOPES)[number];

export const SCOPE_LABELS: Record<WorkScope, string> = {
  ee: "Extended essay",
  tok: "TOK",
  cas: "CAS",
};

export function isValidScope(scope: unknown): scope is WorkScope {
  return typeof scope === "string" && (WORK_SCOPES as readonly string[]).includes(scope);
}
