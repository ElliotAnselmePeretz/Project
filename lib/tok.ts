// Extension-qualified so `node --test --experimental-strip-types` resolves it.
import type { StageDef } from "./ia.ts";

/**
 * TOK is assessed through two separate pieces of work with different
 * audiences: the exhibition is marked in school, the essay is sent away. They
 * are tracked separately throughout — separate stages, deadlines, word counts,
 * goals, notes and predicted grades — because they are done months apart.
 */
export const TOK_COMPONENTS = ["exhibition", "essay"] as const;
export type TokComponent = (typeof TOK_COMPONENTS)[number];

export function isValidComponent(value: unknown): value is TokComponent {
  return typeof value === "string" && (TOK_COMPONENTS as readonly string[]).includes(value);
}

export interface ComponentMeta {
  label: string;
  marking: string;
  blurb: string;
  /** What the "title" field means for this component. */
  titleLabel: string;
  titleHint: string;
}

export const COMPONENT_META: Record<TokComponent, ComponentMeta> = {
  exhibition: {
    label: "Exhibition",
    marking: "Internally marked",
    blurb: "Three objects, and a commentary on how each connects to your prompt.",
    titleLabel: "Prompt",
    titleHint: "The IA prompt your three objects answer.",
  },
  essay: {
    label: "Essay",
    marking: "Externally marked",
    blurb: "A response to one of the prescribed titles released for your session.",
    titleLabel: "Prescribed title",
    titleHint: "Which of the titles for your session you chose.",
  },
};

const EXHIBITION_STAGES: StageDef[] = [
  { key: "prompt", label: "Prompt chosen" },
  { key: "objects", label: "Objects chosen" },
  { key: "draft", label: "Commentary drafted" },
  { key: "feedback", label: "Teacher feedback" },
  { key: "final", label: "Submitted" },
];

const ESSAY_STAGES: StageDef[] = [
  { key: "prompt", label: "Title chosen" },
  { key: "objects", label: "Outline planned" },
  { key: "draft", label: "First draft" },
  { key: "feedback", label: "Teacher feedback" },
  { key: "final", label: "Submitted" },
];

/** Shared keys, different wording — so a stored stage survives a rewording. */
export const TOK_STAGE_KEYS: string[] = EXHIBITION_STAGES.map((s) => s.key);

export function stagesForComponent(component: TokComponent): StageDef[] {
  return component === "exhibition" ? EXHIBITION_STAGES : ESSAY_STAGES;
}

export function isValidTokStage(key: unknown): boolean {
  return typeof key === "string" && TOK_STAGE_KEYS.includes(key);
}

export function tokStageIndex(key: string | null): number {
  return key === null ? -1 : TOK_STAGE_KEYS.indexOf(key);
}

/**
 * The exhibition takes exactly three objects, so they are fixed numbered slots
 * rather than a list you add to — the same reasoning as the EE's three
 * reflections.
 */
export const OBJECT_SLOTS = [1, 2, 3] as const;

export function isValidObjectSlot(slot: unknown): boolean {
  return Number.isInteger(slot) && (OBJECT_SLOTS as readonly number[]).includes(slot as number);
}

export interface TokObjectLike {
  slot: number;
  name: string | null;
}

/** How many object slots actually have something in them. */
export function objectsChosen(objects: TokObjectLike[]): number {
  return OBJECT_SLOTS.filter((slot) =>
    objects.some((o) => o.slot === slot && (o.name ?? "").trim().length > 0),
  ).length;
}

/** TOK is graded A to E, like the extended essay. */
export const TOK_GRADES = ["A", "B", "C", "D", "E"] as const;

export function isValidTokGrade(value: unknown): boolean {
  return typeof value === "string" && (TOK_GRADES as readonly string[]).includes(value);
}

/** The work scope a component's goals and notes live under. */
export function scopeForComponent(component: TokComponent): string {
  return `tok-${component}`;
}
