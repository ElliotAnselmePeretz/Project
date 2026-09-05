import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPlan,
  rankTasks,
  replan,
  urgencyOf,
  dayDiff,
  startOfDay,
  BREAK_MINUTES,
  BLOCK_CAP_MINUTES,
  UNBLOCK_MINUTES,
  type PlannerTask,
  type PlannerSettings,
  minutesToDeduct,
  withClockTimes,
  type Difficulty,
  type Purpose,
} from "./daily-study-planner.ts";

const NOW = new Date(2026, 8, 4, 9, 0, 0); // Fri 4 Sep 2026, 09:00 local

function task(over: Partial<PlannerTask> & { key: string }): PlannerTask {
  return {
    sourceType: "deadline",
    sourceId: over.key,
    title: over.key,
    subject: null,
    dueAt: null,
    confidence: 1,
    dateConfirmed: true,
    difficulty: "comfortable" as Difficulty,
    remainingMinutes: 60,
    purpose: "practise" as Purpose,
    purposeConfirmed: true,
    ...over,
  };
}

const settings = (over: Partial<PlannerSettings> = {}): PlannerSettings => ({
  availableMinutes: 120,
  focus: "okay",
  ...over,
});

const at = (day: number, hour = 12) => new Date(2026, 8, day, hour, 0, 0);
const studyBlocks = (p: ReturnType<typeof buildPlan>) => p.blocks.filter((b) => b.kind !== "break");
const totalMinutes = (p: ReturnType<typeof buildPlan>) => p.blocks.reduce((n, b) => n + b.minutes, 0);

// --- urgency and day maths ---------------------------------------------------

test("urgency separates overdue, today, soon, later and undated", () => {
  assert.equal(urgencyOf(task({ key: "a", dueAt: at(3) }), NOW), "overdue");
  assert.equal(urgencyOf(task({ key: "b", dueAt: at(4, 23) }), NOW), "today");
  assert.equal(urgencyOf(task({ key: "c", dueAt: at(6) }), NOW), "soon");
  assert.equal(urgencyOf(task({ key: "d", dueAt: at(20) }), NOW), "later");
  assert.equal(urgencyOf(task({ key: "e", dueAt: null }), NOW), "undated");
});

test("an unconfirmed imported date is a question, not a deadline", () => {
  const guessed = task({ key: "g", dueAt: at(4), confidence: 0.6, dateConfirmed: false });
  assert.equal(urgencyOf(guessed, NOW), "needs-date-check");
  // Once confirmed it behaves as a real deadline.
  assert.equal(urgencyOf({ ...guessed, dateConfirmed: true }, NOW), "today");
});

test("work earlier today is still today, not overdue", () => {
  // 08:00 has passed at 09:00, but it is still today's work.
  assert.equal(urgencyOf(task({ key: "x", dueAt: at(4, 8) }), NOW), "today");
});

test("midnight boundaries fall on the correct day", () => {
  assert.equal(urgencyOf(task({ key: "a", dueAt: new Date(2026, 8, 4, 23, 59) }), NOW), "today");
  assert.equal(urgencyOf(task({ key: "b", dueAt: new Date(2026, 8, 5, 0, 1) }), NOW), "soon");
});

test("day difference survives a DST boundary", () => {
  // Most of Europe moves the clock on 25 Oct 2026; that local day is 25 hours.
  const before = new Date(2026, 9, 24, 12, 0);
  const after = new Date(2026, 9, 26, 12, 0);
  assert.equal(dayDiff(before, after), 2, "a 23h or 25h day must still count as one day");
  assert.equal(startOfDay(after).getHours(), 0);
});

// --- ranking -----------------------------------------------------------------

test("due-today work stays ahead of easier work due later", () => {
  const ranked = rankTasks(
    [
      task({ key: "easy-later", dueAt: at(10), difficulty: "comfortable" }),
      task({ key: "hard-today", dueAt: at(4, 17), difficulty: "challenging" }),
    ],
    settings(),
    NOW,
  );
  assert.equal(ranked[0].key, "hard-today");
});

test("within today the earlier cutoff wins regardless of difficulty", () => {
  const ranked = rankTasks(
    [
      task({ key: "evening", dueAt: at(4, 22), difficulty: "challenging" }),
      task({ key: "morning", dueAt: at(4, 10), difficulty: "comfortable" }),
    ],
    settings({ focus: "good" }),
    NOW,
  );
  assert.equal(ranked[0].key, "morning", "a hard cutoff outranks a focus preference");
});

test("good focus promotes challenging work inside the same urgency band", () => {
  const tasks = [
    task({ key: "comfy", dueAt: at(6), difficulty: "comfortable" }),
    task({ key: "challenging", dueAt: at(7), difficulty: "challenging" }),
  ];
  assert.equal(rankTasks(tasks, settings({ focus: "good" }), NOW)[0].key, "challenging");
  // With lower focus, the due date decides instead.
  assert.equal(rankTasks(tasks, settings({ focus: "okay" }), NOW)[0].key, "comfy");
});

test("being stuck does not win on difficulty alone", () => {
  const ranked = rankTasks(
    [
      task({ key: "stuck", dueAt: at(7), difficulty: "stuck" }),
      task({ key: "doable", dueAt: at(7), difficulty: "challenging" }),
    ],
    settings({ focus: "good" }),
    NOW,
  );
  assert.equal(ranked[0].key, "doable");
});

test("ordering is stable for identical tasks", () => {
  const tasks = [task({ key: "b", dueAt: at(6) }), task({ key: "a", dueAt: at(6) })];
  const once = rankTasks(tasks, settings(), NOW).map((t) => t.key);
  const twice = rankTasks([...tasks].reverse(), settings(), NOW).map((t) => t.key);
  assert.deepEqual(once, twice, "the same set must always rank the same way");
  assert.deepEqual(once, ["a", "b"]);
});

// --- allocation ---------------------------------------------------------------

test("work plus breaks never exceeds the available time", () => {
  const many = Array.from({ length: 12 }, (_, i) =>
    task({ key: `t${i}`, dueAt: at(4, 10 + i), remainingMinutes: 90 }),
  );
  for (const available of [30, 45, 60, 120, 200]) {
    const plan = buildPlan(many, settings({ availableMinutes: available }), NOW);
    assert.ok(
      totalMinutes(plan) <= available,
      `used ${totalMinutes(plan)} of ${available} available`,
    );
  }
});

test("low focus shortens blocks", () => {
  const one = [task({ key: "big", dueAt: at(4, 17), remainingMinutes: 200 })];
  const low = buildPlan(one, settings({ focus: "low" }), NOW);
  const okay = buildPlan(one, settings({ focus: "okay" }), NOW);
  assert.equal(studyBlocks(low)[0].minutes, BLOCK_CAP_MINUTES.low);
  assert.equal(studyBlocks(okay)[0].minutes, BLOCK_CAP_MINUTES.okay);
  assert.ok(studyBlocks(low)[0].minutes < studyBlocks(okay)[0].minutes);
});

test("a stuck task becomes a short unblocking block and keeps its remaining work", () => {
  const stuck = task({ key: "s", dueAt: at(4, 17), difficulty: "stuck", remainingMinutes: 180 });
  const plan = buildPlan([stuck], settings(), NOW);
  const block = studyBlocks(plan)[0];
  assert.equal(block.kind, "unblock");
  assert.equal(block.minutes, UNBLOCK_MINUTES);
  assert.match(block.reason ?? "", /does not finish/i, "must not imply the task is done");
  // The estimate itself is untouched — a 10-minute step is not progress against 180.
  assert.equal(stuck.remainingMinutes, 180);
});

test("breaks separate study blocks but never lead or trail", () => {
  const plan = buildPlan(
    [
      task({ key: "a", dueAt: at(4, 10), remainingMinutes: 40 }),
      task({ key: "b", dueAt: at(4, 11), remainingMinutes: 40 }),
    ],
    settings({ availableMinutes: 200 }),
    NOW,
  );
  assert.notEqual(plan.blocks[0].kind, "break");
  assert.notEqual(plan.blocks[plan.blocks.length - 1].kind, "break");
  assert.equal(plan.blocks.filter((b) => b.kind === "break").length, 1);
  assert.equal(plan.breakMinutes, BREAK_MINUTES);
});

test("urgent work that does not fit is reported, not hidden", () => {
  const plan = buildPlan(
    [
      task({ key: "first", dueAt: at(4, 10), remainingMinutes: 60 }),
      task({ key: "also-today", dueAt: at(4, 16), remainingMinutes: 90 }),
    ],
    settings({ availableMinutes: 40 }),
    NOW,
  );
  assert.equal(plan.unscheduled.length, 1);
  assert.equal(plan.unscheduled[0].task.key, "also-today");
  assert.equal(plan.urgentShortfallMinutes, 90, "the shortfall must be stated in minutes");
});

test("a tiny budget schedules nothing rather than a useless sliver", () => {
  const plan = buildPlan([task({ key: "a", dueAt: at(4, 10) })], settings({ availableMinutes: 5 }), NOW);
  assert.equal(studyBlocks(plan).length, 0);
  assert.equal(plan.unscheduled.length, 1);
});

test("every scheduled block carries a method and a reason", () => {
  const plan = buildPlan(
    [
      task({ key: "w", dueAt: at(4, 12), purpose: "write" }),
      task({ key: "p", dueAt: at(5), purpose: "practise" }),
      task({ key: "s", dueAt: at(6), difficulty: "stuck" }),
    ],
    settings({ availableMinutes: 300 }),
    NOW,
  );
  for (const block of studyBlocks(plan)) {
    assert.ok(block.method && block.method.length > 20, `no method on ${block.title}`);
    assert.ok(block.reason && block.reason.length > 0, `no reason on ${block.title}`);
  }
});

test("a submit block tells the student to submit it themselves", () => {
  const plan = buildPlan([task({ key: "sub", dueAt: at(4, 15), purpose: "submit" })], settings(), NOW);
  assert.match(studyBlocks(plan)[0].method ?? "", /submit it in ManageBac yourself/i);
});

test("a guessed date never displaces confirmed urgent work", () => {
  const ranked = rankTasks(
    [
      task({ key: "guessed", dueAt: at(4), confidence: 0.5, dateConfirmed: false }),
      task({ key: "real-today", dueAt: at(4, 17) }),
      task({ key: "overdue", dueAt: at(2) }),
    ],
    settings(),
    NOW,
  );
  assert.deepEqual(
    ranked.map((t) => t.key),
    ["overdue", "real-today", "guessed"],
    "an unconfirmed import must not outrank a real deadline",
  );
});

test("a guessed date still outranks merely-soon work, and says it is a guess", () => {
  const ranked = rankTasks(
    [
      task({ key: "soon", dueAt: at(6) }),
      task({ key: "guessed", dueAt: at(4), confidence: 0.5, dateConfirmed: false }),
    ],
    settings(),
    NOW,
  );
  assert.equal(ranked[0].key, "guessed", "it must stay visible, not be buried");
  assert.match(buildPlan([ranked[0]], settings(), NOW).blocks[0].reason ?? "", /guess/i);
});

// --- replanning ----------------------------------------------------------------

test("replanning keeps completed blocks and spends only the time left", () => {
  const done = [
    {
      kind: "study" as const,
      minutes: 40,
      taskKey: "deadline:done",
      title: "Finished earlier",
    },
  ];
  const plan = replan(
    done,
    [task({ key: "deadline:done", dueAt: at(4, 10) }), task({ key: "deadline:next", dueAt: at(4, 12) })],
    settings({ availableMinutes: 100 }),
    NOW,
  );

  assert.equal(plan.blocks[0].title, "Finished earlier", "completed work stays put");
  assert.ok(
    !plan.blocks.slice(1).some((b) => b.taskKey === "deadline:done"),
    "a kept task must not be scheduled twice",
  );
  assert.ok(totalMinutes(plan) <= 100, `replan used ${totalMinutes(plan)} of 100`);
});

test("replanning with no time left keeps the kept blocks and schedules nothing", () => {
  const done = [{ kind: "study" as const, minutes: 60, taskKey: "deadline:a", title: "Done" }];
  const plan = replan(done, [task({ key: "deadline:b", dueAt: at(4, 12) })], settings({ availableMinutes: 60 }), NOW);
  assert.equal(plan.blocks.length, 1);
  assert.equal(plan.unscheduled.length, 1);
});

test("replanning carries a kept block's badges across, not just its text", () => {
  const kept = [
    {
      kind: "study" as const,
      minutes: 40,
      taskKey: "deadline:x",
      title: "Kept",
      subject: "Physics",
      purpose: "write" as const,
      method: "Some method",
      reason: "Already past its due date.",
      urgency: "overdue" as const,
    },
  ];
  const plan = replan(kept, [], settings({ availableMinutes: 120 }), NOW);
  assert.equal(plan.blocks[0].urgency, "overdue", "urgency must survive a replan");
  assert.equal(plan.blocks[0].purpose, "write");
  assert.equal(plan.blocks[0].subject, "Physics");
});

// --- progress carry-forward ---------------------------------------------------

test("a recorded block deducts the time actually spent", () => {
  assert.equal(minutesToDeduct("progress", 40, 38), 38);
  assert.equal(minutesToDeduct("finished", 40, null), 40, "falls back to the planned length");
});

test("being stuck deducts nothing from the work left", () => {
  assert.equal(minutesToDeduct("stuck", 10, 10), 0, "struggling is not progress");
});

test("clearing an outcome deducts nothing", () => {
  assert.equal(minutesToDeduct(null, 40, 40), 0);
});

test("clock times run consecutively from the session start", () => {
  const times = withClockTimes([{ minutes: 40 }, { minutes: 5 }, { minutes: 25 }], new Date(2026, 8, 4, 16, 0));
  assert.equal(times[0].startsAt.getHours(), 16);
  assert.equal(times[0].endsAt.getMinutes(), 40);
  assert.equal(times[1].startsAt.getMinutes(), 40, "the next block starts when the last ended");
  assert.equal(times[2].endsAt.getHours(), 17);
  assert.equal(times[2].endsAt.getMinutes(), 10);
});

test("clock times cross midnight without going backwards", () => {
  const times = withClockTimes([{ minutes: 40 }, { minutes: 40 }], new Date(2026, 8, 4, 23, 30));
  assert.ok(times[1].startsAt.getTime() > times[0].startsAt.getTime());
  assert.equal(times[1].endsAt.getDate(), 5, "a late session rolls into the next day");
});
