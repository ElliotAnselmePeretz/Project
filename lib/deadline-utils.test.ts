import { test } from "node:test";
import assert from "node:assert/strict";
import { bucketFor, daysBetween, streakFrom, cleanTitle, startOfDay } from "./deadline-utils.ts";

const NOW = new Date(2026, 8, 4, 14, 0, 0); // 4 Sep 2026, 14:00 local
const at = (day: number, hour = 12) => new Date(2026, 8, day, hour, 0, 0);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

test("buckets sort by calendar day, not elapsed hours", () => {
  assert.equal(bucketFor(at(3), NOW), "overdue");
  assert.equal(bucketFor(at(4), NOW), "today");
  assert.equal(bucketFor(at(5), NOW), "tomorrow");
  assert.equal(bucketFor(at(9), NOW), "week");
  assert.equal(bucketFor(at(30), NOW), "later");
});

test("something due later today is still today, not overdue", () => {
  // 23:00 today is 9 hours away; 09:00 today already passed but is still "today".
  assert.equal(bucketFor(at(4, 23), NOW), "today");
  assert.equal(bucketFor(at(4, 9), NOW), "today");
});

test("just-before-midnight and just-after are different days", () => {
  assert.equal(bucketFor(new Date(2026, 8, 4, 23, 59), NOW), "today");
  assert.equal(bucketFor(new Date(2026, 8, 5, 0, 1), NOW), "tomorrow");
});

test("daysBetween ignores the time of day", () => {
  assert.equal(daysBetween(new Date(2026, 8, 4, 23, 0), new Date(2026, 8, 5, 1, 0)), 1);
  assert.equal(daysBetween(new Date(2026, 8, 4, 1, 0), new Date(2026, 8, 4, 23, 0)), 0);
});

test("streak counts consecutive days ending today", () => {
  assert.equal(streakFrom([daysAgo(0), daysAgo(1), daysAgo(2)], NOW), 3);
});

test("several completions on one day count once", () => {
  assert.equal(streakFrom([at(4, 9), at(4, 13), at(4, 20)], NOW), 1);
});

test("a streak survives until a day is actually missed", () => {
  // Finished yesterday, nothing yet today — still alive.
  assert.equal(streakFrom([daysAgo(1), daysAgo(2)], NOW), 2);
  // Nothing yesterday or today — broken.
  assert.equal(streakFrom([daysAgo(2), daysAgo(3)], NOW), 0);
});

test("a gap ends the streak at the gap", () => {
  assert.equal(streakFrom([daysAgo(0), daysAgo(1), daysAgo(4), daysAgo(5)], NOW), 2);
});

test("no completions is a streak of zero", () => {
  assert.equal(streakFrom([], NOW), 0);
});

test("titles are trimmed, collapsed and capped; blanks rejected", () => {
  assert.equal(cleanTitle("  Essay   draft  "), "Essay draft");
  assert.equal(cleanTitle("   "), null);
  assert.equal(cleanTitle(42), null);
  assert.equal(cleanTitle("x".repeat(200))?.length, 140);
});

test("startOfDay lands on local midnight", () => {
  const s = startOfDay(new Date(2026, 8, 4, 17, 30));
  assert.equal(s.getHours(), 0);
  assert.equal(s.getDate(), 4);
});

test("bucket and label agree for something due later the same day", () => {
  // 19:00 today, seen at 14:00: five hours away but still today.
  const evening = new Date(2026, 8, 4, 19, 0);
  assert.equal(bucketFor(evening, NOW), "today");
  assert.equal(daysBetween(NOW, evening), 0, "label maths must agree with the bucket");
});
