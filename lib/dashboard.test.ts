import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dayKey,
  daysUntil,
  relativeDay,
  buildAgenda,
  groupByDay,
  monthGrid,
  type AgendaItem,
} from "./dashboard.ts";

// Local times throughout: the dashboard deals in the student's own days.
const NOW = new Date(2026, 8, 15, 14, 30); // 15 Sep 2026, 14:30

function item(id: string, dueAt: Date, kind: AgendaItem["kind"] = "deadline"): AgendaItem {
  return { id, kind, title: id, context: null, dueAt, href: "/" };
}

test("dayKey uses the local calendar day, zero-padded", () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("daysUntil counts calendar days, not 24-hour periods", () => {
  // 23:59 tomorrow is still one day away from 14:30 today, not zero.
  assert.equal(daysUntil(new Date(2026, 8, 16, 0, 1), NOW), 1);
  assert.equal(daysUntil(new Date(2026, 8, 15, 23, 59), NOW), 0);
  assert.equal(daysUntil(new Date(2026, 8, 14, 9, 0), NOW), -1);
});

test("relativeDay reads naturally at each boundary", () => {
  assert.equal(relativeDay(new Date(2026, 8, 15, 9), NOW), "Today");
  assert.equal(relativeDay(new Date(2026, 8, 16, 9), NOW), "Tomorrow");
  assert.equal(relativeDay(new Date(2026, 8, 14, 9), NOW), "Yesterday");
  assert.equal(relativeDay(new Date(2026, 8, 20, 9), NOW), "In 5 days");
  assert.equal(relativeDay(new Date(2026, 8, 12, 9), NOW), "3 days ago");
});

test("the agenda is soonest first", () => {
  const out = buildAgenda(
    [item("later", new Date(2026, 8, 30)), item("soon", new Date(2026, 8, 16)), item("mid", new Date(2026, 8, 20))],
    { now: NOW },
  );
  assert.deepEqual(out.map((i) => i.id), ["soon", "mid", "later"]);
});

test("the agenda keeps recent overdue items but drops stale ones", () => {
  const out = buildAgenda(
    [item("missed-last-week", new Date(2026, 8, 10)), item("missed-in-june", new Date(2026, 5, 1))],
    { now: NOW, lookbackDays: 7 },
  );
  assert.deepEqual(out.map((i) => i.id), ["missed-last-week"]);
});

test("the agenda ignores invalid dates instead of sorting them anywhere", () => {
  const out = buildAgenda([item("broken", new Date("nope")), item("fine", new Date(2026, 8, 16))], { now: NOW });
  assert.deepEqual(out.map((i) => i.id), ["fine"]);
});

test("groupByDay puts same-day items together regardless of time", () => {
  const groups = groupByDay([
    item("a", new Date(2026, 8, 16, 8)),
    item("b", new Date(2026, 8, 16, 22)),
    item("c", new Date(2026, 8, 17, 8)),
  ]);
  assert.equal(groups.get("2026-09-16")?.length, 2);
  assert.equal(groups.get("2026-09-17")?.length, 1);
});

test("monthGrid starts weeks on Monday and fills whole rows", () => {
  const weeks = monthGrid(2026, 8); // September 2026 starts on a Tuesday
  for (const week of weeks) assert.equal(week.length, 7);
  assert.equal(weeks[0][0].date.getDay(), 1, "first cell is a Monday");
  assert.equal(weeks[0][0].inMonth, false, "31 Aug pads the first row");
  assert.equal(weeks[0][1].key, "2026-09-01");
});

test("monthGrid covers every day of the month exactly once", () => {
  for (const [year, month, days] of [
    [2026, 8, 30],
    [2026, 1, 28], // February, non-leap
    [2028, 1, 29], // February, leap
    [2026, 5, 30], // June 2026 starts on a Monday
    [2026, 10, 30], // November 2026 ends on a Monday
  ] as const) {
    const inMonth = monthGrid(year, month).flat().filter((d) => d.inMonth);
    assert.equal(inMonth.length, days, `${year}-${month + 1}`);
    assert.equal(new Set(inMonth.map((d) => d.key)).size, days, "no duplicates");
  }
});

test("monthGrid never ends with a row made entirely of next month", () => {
  for (let month = 0; month < 12; month++) {
    const weeks = monthGrid(2026, month);
    assert.ok(weeks[weeks.length - 1].some((d) => d.inMonth), `month ${month + 1}`);
  }
});
