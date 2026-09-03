import { test } from "node:test";
import assert from "node:assert/strict";
import { extractDeadline } from "./extract.ts";

const RECEIVED = new Date("2026-09-03T09:00:00Z");
const on = (d: Date) => d.toISOString().slice(0, 10);

test("picks the explicit date over a vague one in the subject", () => {
  const r = extractDeadline("Economics IA due Friday", "Please submit your commentary by Friday 11th September.", RECEIVED);
  assert.ok(r);
  assert.equal(on(r.dueAt), "2026-09-11");
});

test("prefers 'on 15 September' over 'next week'", () => {
  const r = extractDeadline("Physics test next week", "There will be a test on 15 September, revise chapters 1-3.", RECEIVED);
  assert.ok(r);
  assert.equal(on(r.dueAt), "2026-09-15");
});

test("handles relative dates against the received date", () => {
  const r = extractDeadline("Reminder: Maths homework", "Exercise 4B is due next Tuesday.", RECEIVED);
  assert.ok(r);
  assert.equal(on(r.dueAt), "2026-09-08");
});

test("ignores mail with dates but no deadline cues", () => {
  assert.equal(extractDeadline("Lunch menu this week", "Monday: pasta. Tuesday: curry.", RECEIVED), null);
  assert.equal(extractDeadline("Party invite", "Come round on Saturday!", RECEIVED), null);
});

test("ignores newsletters even when they mention deadlines", () => {
  const r = extractDeadline("Newsletter September", "Read about our trip on 12 September. Unsubscribe here.", RECEIVED);
  assert.equal(r, null);
});

test("never reports full confidence — email dates are always inferred", () => {
  const r = extractDeadline("Re: Extended essay", "Your first draft deadline is 30 September, no later than 5pm.", RECEIVED);
  assert.ok(r);
  assert.ok(r.confidence < 1, "confidence must stay below 1.0");
});
