// Extension-qualified so `node --test --experimental-strip-types` resolves it.
import type { StageDef } from "./ia.ts";

/**
 * The extended essay is one long project rather than six parallel ones, so it
 * gets its own stages — including a supervisor step, which a subject IA does
 * not have, and no final "assessed" step, because the viva voce is tracked as
 * a reflection instead.
 */
export const EE_STAGES: StageDef[] = [
  { key: "topic", label: "Topic chosen" },
  { key: "supervisor", label: "Supervisor assigned" },
  { key: "question", label: "Question agreed" },
  { key: "research", label: "Research & reading" },
  { key: "draft", label: "First draft" },
  { key: "feedback", label: "Supervisor feedback" },
  { key: "final", label: "Submitted" },
];

export const EE_STAGE_KEYS: string[] = EE_STAGES.map((s) => s.key);

export function isValidEeStage(key: unknown): boolean {
  return typeof key === "string" && EE_STAGE_KEYS.includes(key);
}

export function eeStageIndex(key: string | null): number {
  return key === null ? -1 : EE_STAGE_KEYS.indexOf(key);
}

/**
 * The three formal reflection sessions with a supervisor. These are fixed and
 * ordered — there are three, and the last is the viva voce — so they are
 * modelled as named slots rather than a list you add to.
 */
export interface ReflectionSession {
  key: string;
  label: string;
  hint: string;
}

export const EE_REFLECTIONS: ReflectionSession[] = [
  {
    key: "initial",
    label: "First reflection",
    hint: "Early on: your topic, initial reading, and how you plan to approach it.",
  },
  {
    key: "interim",
    label: "Interim reflection",
    hint: "Partway through: what the research is showing, and what has changed.",
  },
  {
    key: "viva",
    label: "Final reflection (viva voce)",
    hint: "After submitting: what you learned, and what you would do differently.",
  },
];

export const REFLECTION_KEYS: string[] = EE_REFLECTIONS.map((r) => r.key);

export function isValidReflection(key: unknown): boolean {
  return typeof key === "string" && REFLECTION_KEYS.includes(key);
}

/** The EE is graded A to E, not 1 to 7 like a subject. */
export const EE_GRADES = ["A", "B", "C", "D", "E"] as const;
export type EeGrade = (typeof EE_GRADES)[number];

export function isValidEeGrade(value: unknown): boolean {
  return typeof value === "string" && (EE_GRADES as readonly string[]).includes(value);
}

/**
 * How many of the three reflections have something written in them. Used to
 * show progress without pretending an empty slot counts.
 */
export function reflectionsDone(entries: { sessionKey: string; body: string | null }[]): number {
  return REFLECTION_KEYS.filter((key) =>
    entries.some((e) => e.sessionKey === key && (e.body ?? "").trim().length > 0),
  ).length;
}
