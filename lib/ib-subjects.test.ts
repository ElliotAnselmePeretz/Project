import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSelections, type SubjectSelectionInput } from "./ib-subjects.ts";

function pick(hlGroups: number[]): SubjectSelectionInput[] {
  return [1, 2, 3, 4, 5, 6].map((groupNumber) => ({
    groupNumber,
    subjectName: `Subject ${groupNumber}`,
    level: hlGroups.includes(groupNumber) ? "HL" : "SL",
  }));
}

test("accepts 3 HL / 3 SL", () => {
  assert.equal(validateSelections(pick([1, 2, 3])), null);
});

test("accepts 4 HL / 2 SL", () => {
  assert.equal(validateSelections(pick([1, 2, 3, 4])), null);
});

test("rejects fewer than 3 HL", () => {
  assert.ok(validateSelections(pick([1, 2])));
});

test("rejects more than 4 HL", () => {
  assert.ok(validateSelections(pick([1, 2, 3, 4, 5])));
});

test("rejects anything other than 6 subjects", () => {
  assert.ok(validateSelections(pick([1, 2, 3]).slice(0, 5)));
});

test("rejects a duplicate group", () => {
  const subjects = pick([1, 2, 3]);
  subjects[5] = { ...subjects[5], groupNumber: 1 };
  assert.ok(validateSelections(subjects));
});

test("rejects an unknown group number", () => {
  const subjects = pick([1, 2, 3]);
  subjects[0] = { ...subjects[0], groupNumber: 99 };
  assert.ok(validateSelections(subjects));
});

test("rejects an invalid level", () => {
  const subjects = pick([1, 2, 3]);
  subjects[0] = { ...subjects[0], level: "HONORS" };
  assert.ok(validateSelections(subjects));
});
