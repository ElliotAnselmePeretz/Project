import { test } from "node:test";
import assert from "node:assert/strict";
import {
  averagePercent,
  percentOf,
  validateAssessment,
  validateTargetGrade,
  validateText,
  isValidGroup,
} from "./subject-manager.ts";

const ok = { title: "Paper 1 mock", mark: 32, maxMark: 45 };

test("accepts a well-formed assessment", () => {
  assert.equal(validateAssessment(ok), null);
});

test("rejects a mark above the marks available", () => {
  assert.ok(validateAssessment({ ...ok, mark: 46, maxMark: 45 }));
});

test("allows full marks", () => {
  assert.equal(validateAssessment({ ...ok, mark: 45, maxMark: 45 }), null);
});

test("rejects a blank or whitespace-only name", () => {
  assert.ok(validateAssessment({ ...ok, title: "" }));
  assert.ok(validateAssessment({ ...ok, title: "   " }));
});

test("rejects zero or negative marks available", () => {
  assert.ok(validateAssessment({ ...ok, maxMark: 0 }));
  assert.ok(validateAssessment({ ...ok, maxMark: -10 }));
});

test("rejects a negative mark", () => {
  assert.ok(validateAssessment({ ...ok, mark: -1 }));
});

test("rejects non-numeric marks", () => {
  assert.ok(validateAssessment({ ...ok, mark: Number.NaN }));
  assert.ok(validateAssessment({ ...ok, maxMark: Number.NaN }));
});

test("rejects a zero or negative weight but allows none at all", () => {
  assert.ok(validateAssessment({ ...ok, weight: 0 }));
  assert.ok(validateAssessment({ ...ok, weight: -2 }));
  assert.equal(validateAssessment({ ...ok, weight: null }), null);
  assert.equal(validateAssessment({ ...ok, weight: 2.5 }), null);
});

test("target grade accepts 1 through 7 only", () => {
  for (let g = 1; g <= 7; g++) assert.equal(validateTargetGrade(g), null, `grade ${g} should be valid`);
  assert.ok(validateTargetGrade(0));
  assert.ok(validateTargetGrade(8));
  assert.ok(validateTargetGrade(5.5));
});

test("percentOf converts a mark, and refuses to divide by zero", () => {
  assert.equal(percentOf(9, 10), 90);
  assert.equal(percentOf(5, 0), null);
});

test("average of an empty list is null, not zero", () => {
  assert.equal(averagePercent([]), null);
});

test("averages unweighted assessments equally", () => {
  const avg = averagePercent([
    { mark: 5, maxMark: 10 }, // 50%
    { mark: 9, maxMark: 10 }, // 90%
  ]);
  assert.equal(avg, 70);
});

test("respects weights", () => {
  // 50% counting three times, 90% counting once => (50*3 + 90) / 4 = 60
  const avg = averagePercent([
    { mark: 5, maxMark: 10, weight: 3 },
    { mark: 9, maxMark: 10, weight: 1 },
  ]);
  assert.equal(avg, 60);
});

test("skips unscoreable rows instead of poisoning the average", () => {
  const avg = averagePercent([
    { mark: 8, maxMark: 10 },
    { mark: 3, maxMark: 0 }, // cannot be scored
  ]);
  assert.equal(avg, 80);
});

test("validateText catches empty and overlong values", () => {
  assert.ok(validateText("", "Note", 10));
  assert.ok(validateText("   ", "Note", 10));
  assert.ok(validateText("x".repeat(11), "Note", 10));
  assert.equal(validateText("fine", "Note", 10), null);
});

test("only groups 1-6 are valid", () => {
  for (let g = 1; g <= 6; g++) assert.ok(isValidGroup(g));
  assert.ok(!isValidGroup(0));
  assert.ok(!isValidGroup(7));
});
