/**
 * Daily study planner — ranking and allocation.
 *
 * Pure: no database, no React, no `Date.now()` except through an injected
 * `now`, so the awkward cases (midnight, DST, ties) can be tested directly.
 *
 * Two rules shape everything here, both from docs/daily-study-planner.md:
 *
 *  - The order must be explainable. Every block carries the reason it landed
 *    where it did. There is no opaque score.
 *  - The plan must never lie about fitting. Work plus breaks stay inside the
 *    stated time, and anything that did not fit is reported rather than hidden
 *    or silently truncated.
 */

export type Focus = "low" | "okay" | "good";
export type Difficulty = "comfortable" | "challenging" | "stuck";
export type Purpose = "learn" | "practise" | "write" | "submit";
export type SourceType = "deadline" | "goal";

export type Urgency = "needs-date-check" | "overdue" | "today" | "soon" | "later" | "undated";

/**
 * Confirmed urgency outranks a guess.
 *
 * The check-in asks about uncertain imported dates before anything is planned,
 * which is where "confirm uncertain dates first" belongs. Inside the schedule
 * an unconfirmed date sits *after* confirmed overdue and due-today work:
 * letting a guess displace a known deadline would make it more authoritative
 * than a real one, which is exactly what docs/daily-study-planner.md forbids.
 * It stays ahead of merely-soon work so it is still visible and easy to fix.
 */
export const URGENCY_ORDER: Urgency[] = [
  "overdue",
  "today",
  "needs-date-check",
  "soon",
  "later",
  "undated",
];

export const URGENCY_LABELS: Record<Urgency, string> = {
  "needs-date-check": "Check this date",
  overdue: "Overdue",
  today: "Due today",
  soon: "Due in the next three days",
  later: "Later",
  undated: "No date",
};

/** A candidate for the plan: a deadline or a subject goal, plus check-in answers. */
export interface PlannerTask {
  /** Stable key: `${sourceType}:${sourceId}`. */
  key: string;
  sourceType: SourceType;
  sourceId: string;
  title: string;
  subject: string | null;
  dueAt: Date | null;
  /** Below 1 means an imported date we inferred rather than read. */
  confidence: number;
  /** Whether the student has confirmed an uncertain imported date. */
  dateConfirmed: boolean;
  difficulty: Difficulty;
  /** Total work the student thinks is left, in minutes. */
  remainingMinutes: number;
  purpose: Purpose;
  /** False when we guessed the purpose from the title; the UI must say so. */
  purposeConfirmed: boolean;
}

export interface PlannerSettings {
  availableMinutes: number;
  focus: Focus;
}

export type BlockKind = "study" | "unblock" | "break";

export interface PlanBlock {
  kind: BlockKind;
  minutes: number;
  taskKey?: string;
  title: string;
  subject?: string | null;
  purpose?: Purpose;
  /** The concrete method for this block — never a bare "study X". */
  method?: string;
  /** Why this landed here. Shown to the student. */
  reason?: string;
  urgency?: Urgency;
}

export interface Unscheduled {
  task: PlannerTask;
  urgency: Urgency;
  reason: string;
}

export interface Plan {
  blocks: PlanBlock[];
  unscheduled: Unscheduled[];
  studyMinutes: number;
  breakMinutes: number;
  spareMinutes: number;
  /** Remaining minutes of overdue/today work that did not fit. */
  urgentShortfallMinutes: number;
}

// --- Tunables. Illustrative defaults, not scientific optima. -----------------

export const BLOCK_CAP_MINUTES: Record<Focus, number> = { low: 25, okay: 40, good: 40 };
export const BREAK_MINUTES = 5;
export const UNBLOCK_MINUTES = 10;
/** Below this, a leftover sliver is not worth scheduling as its own block. */
export const MIN_BLOCK_MINUTES = 10;

// --- Day maths ---------------------------------------------------------------

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Whole calendar days between two instants, in local time.
 *
 * Rounding matters: across a DST boundary a "day" is 23 or 25 hours, so
 * dividing raw milliseconds would land on 0.958 or 1.041 and truncate wrongly.
 */
export function dayDiff(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function urgencyOf(task: PlannerTask, now: Date): Urgency {
  // An unconfirmed imported date is not yet a deadline — it is a question.
  if (task.dueAt && task.confidence < 1 && !task.dateConfirmed) return "needs-date-check";
  if (!task.dueAt) return "undated";

  const days = dayDiff(now, task.dueAt);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  return "later";
}

// --- Ranking -----------------------------------------------------------------

/**
 * Difficulty as a tie-break, per the agreed rule: a focused student may pull a
 * challenging-but-doable task earlier, but "stuck" scores 0 rather than 2 —
 * being hardest must not win on its own.
 */
function difficultyBoost(difficulty: Difficulty, focus: Focus): number {
  if (focus !== "good") return 0;
  return difficulty === "challenging" ? 1 : 0;
}

/**
 * Deterministic ordering. Ties fall through to the task key so the same input
 * always produces the same plan — a plan that reshuffles on every render is
 * impossible to trust or to test.
 */
export function rankTasks(tasks: PlannerTask[], settings: PlannerSettings, now: Date): PlannerTask[] {
  return [...tasks].sort((a, b) => {
    const ua = urgencyOf(a, now);
    const ub = urgencyOf(b, now);
    if (ua !== ub) return URGENCY_ORDER.indexOf(ua) - URGENCY_ORDER.indexOf(ub);

    // Within today, the earlier hard cutoff wins outright — a 09:00 submission
    // beats a 23:59 one regardless of how either feels.
    if (ua === "today" && a.dueAt && b.dueAt && a.dueAt.getTime() !== b.dueAt.getTime()) {
      return a.dueAt.getTime() - b.dueAt.getTime();
    }

    // Elsewhere, focus may promote challenging work inside the same band.
    const boost = difficultyBoost(b.difficulty, settings.focus) - difficultyBoost(a.difficulty, settings.focus);
    if (boost !== 0) return boost;

    if (a.dueAt && b.dueAt && a.dueAt.getTime() !== b.dueAt.getTime()) {
      return a.dueAt.getTime() - b.dueAt.getTime();
    }
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;

    return a.key.localeCompare(b.key);
  });
}

// --- Methods -----------------------------------------------------------------

export function methodFor(task: PlannerTask): string {
  if (task.difficulty === "stuck") {
    return "Name the exact blocker, read one worked example, explain it back, then attempt one small step.";
  }
  switch (task.purpose) {
    case "practise":
      return "Attempt without notes, check, correct what was wrong, then retry a similar question.";
    case "learn":
      return "Read one explanation or worked example, explain the reasoning in your own words, then try one similar question.";
    case "write":
      return "Pick one concrete output — an outline, or a paragraph with evidence — and finish that.";
    case "submit":
      return "Check the task requirements, finish the deliverable, then submit it in ManageBac yourself and confirm it arrived.";
  }
}

function reasonFor(urgency: Urgency, task: PlannerTask, settings: PlannerSettings): string {
  switch (urgency) {
    case "needs-date-check":
      return "The imported date is a guess — confirm it before this is treated as a deadline.";
    case "overdue":
      return "Already past its due date.";
    case "today":
      return "Due today.";
    case "soon":
      return task.difficulty === "challenging" && settings.focus === "good"
        ? "Due within three days, and moved earlier because your focus is good and this is challenging but doable."
        : "Due within the next three days.";
    case "later":
      return "Not urgent yet — scheduled after nearer work.";
    case "undated":
      return "A subject goal with no deadline, placed after dated work.";
  }
}

// --- Allocation ---------------------------------------------------------------

/**
 * Build today's plan.
 *
 * `alreadyDoneMinutes` accounts for blocks completed earlier today so that a
 * replan does not hand back time that has already been spent.
 */
export function buildPlan(
  tasks: PlannerTask[],
  settings: PlannerSettings,
  now: Date = new Date(),
): Plan {
  const budget = Math.max(0, Math.floor(settings.availableMinutes));
  const cap = BLOCK_CAP_MINUTES[settings.focus];
  const ranked = rankTasks(tasks, settings, now);

  const blocks: PlanBlock[] = [];
  const unscheduled: Unscheduled[] = [];
  let used = 0;

  for (const task of ranked) {
    const urgency = urgencyOf(task, now);
    const isStuck = task.difficulty === "stuck";

    // A stuck task gets a short unblocking action, not the biggest block.
    const wanted = isStuck ? Math.min(UNBLOCK_MINUTES, task.remainingMinutes) : Math.min(cap, task.remainingMinutes);

    // Reserve the break that would follow this block, so a plan can never be
    // made to "fit" by pretending the last break is free.
    const needsBreak = blocks.some((b) => b.kind !== "break");
    const breakCost = needsBreak ? BREAK_MINUTES : 0;
    const remainingBudget = budget - used;

    if (wanted + breakCost > remainingBudget) {
      // Try a shortened block in the leftover time, if a useful one fits.
      const shortened = remainingBudget - breakCost;
      if (shortened >= MIN_BLOCK_MINUTES && !isStuck) {
        if (breakCost) {
          blocks.push({ kind: "break", minutes: BREAK_MINUTES, title: "Break" });
          used += BREAK_MINUTES;
        }
        blocks.push({
          kind: "study",
          minutes: shortened,
          taskKey: task.key,
          title: task.title,
          subject: task.subject,
          purpose: task.purpose,
          method: methodFor(task),
          reason: `${reasonFor(urgency, task, settings)} Shortened to fit the time you have.`,
          urgency,
        });
        used += shortened;
        continue;
      }

      unscheduled.push({
        task,
        urgency,
        reason:
          remainingBudget <= 0
            ? "No time left in today's session."
            : "Not enough time left for a useful block.",
      });
      continue;
    }

    if (breakCost) {
      blocks.push({ kind: "break", minutes: BREAK_MINUTES, title: "Break" });
      used += BREAK_MINUTES;
    }

    blocks.push({
      kind: isStuck ? "unblock" : "study",
      minutes: wanted,
      taskKey: task.key,
      title: task.title,
      subject: task.subject,
      purpose: task.purpose,
      method: methodFor(task),
      reason: isStuck
        ? `${reasonFor(urgency, task, settings)} Short unblocking step — this does not finish the task.`
        : reasonFor(urgency, task, settings),
      urgency,
    });
    used += wanted;
  }

  const studyMinutes = blocks.filter((b) => b.kind !== "break").reduce((n, b) => n + b.minutes, 0);
  const breakMinutes = blocks.filter((b) => b.kind === "break").reduce((n, b) => n + b.minutes, 0);

  return {
    blocks,
    unscheduled,
    studyMinutes,
    breakMinutes,
    spareMinutes: Math.max(0, budget - studyMinutes - breakMinutes),
    urgentShortfallMinutes: unscheduled
      .filter((u) => u.urgency === "overdue" || u.urgency === "today")
      .reduce((n, u) => n + u.task.remainingMinutes, 0),
  };
}

/**
 * Regenerate today's plan while protecting work already done and edits already
 * made. Completed and manually-edited blocks are kept exactly as they are, the
 * time they consumed is taken off the budget, and only the remainder is
 * replanned.
 */
export function replan(
  keep: PlanBlock[],
  tasks: PlannerTask[],
  settings: PlannerSettings,
  now: Date = new Date(),
): Plan {
  const keptMinutes = keep.reduce((n, b) => n + b.minutes, 0);
  const keptKeys = new Set(keep.map((b) => b.taskKey).filter(Boolean));

  const rest = buildPlan(
    tasks.filter((t) => !keptKeys.has(t.key)),
    { ...settings, availableMinutes: Math.max(0, settings.availableMinutes - keptMinutes) },
    now,
  );

  return {
    ...rest,
    blocks: [...keep, ...rest.blocks],
    studyMinutes: rest.studyMinutes + keep.filter((b) => b.kind !== "break").reduce((n, b) => n + b.minutes, 0),
    breakMinutes: rest.breakMinutes + keep.filter((b) => b.kind === "break").reduce((n, b) => n + b.minutes, 0),
  };
}
