import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultAssessmentLabel,
  isOralGroup,
  assessmentLabelsByGroup,
  stagesFor,
  stageIndex,
  isValidStage,
  lengthUnitFor,
  lengthFraction,
  criteriaTotals,
  validateCriterion,
  validateSelfMark,
  STAGE_KEYS,
  ORAL_LABEL,
  WRITTEN_LABEL,
} from "./ia.ts";

test("the two language groups default to the oral label", () => {
  assert.equal(defaultAssessmentLabel(1), ORAL_LABEL);
  assert.equal(defaultAssessmentLabel(2), ORAL_LABEL);
});

test("the other four groups default to the written label", () => {
  for (const g of [3, 4, 5, 6]) {
    assert.equal(defaultAssessmentLabel(g), WRITTEN_LABEL, `group ${g}`);
  }
});

test("isOralGroup agrees with the labelling", () => {
  assert.ok(isOralGroup(1));
  assert.ok(isOralGroup(2));
  assert.ok(!isOralGroup(4));
});

test("every group gets exactly one label", () => {
  const all = assessmentLabelsByGroup();
  assert.equal(all.length, 6);
  assert.equal(all.filter((a) => a.label === ORAL_LABEL).length, 2);
});

test("oral and written stages share keys but differ in wording", () => {
  const written = stagesFor(4);
  const oral = stagesFor(2);
  assert.deepEqual(
    written.map((s) => s.key),
    oral.map((s) => s.key),
    "keys must match so a stored stage stays valid either way",
  );
  assert.notEqual(written[3].label, oral[3].label);
  assert.equal(oral[3].label, "Practised");
});

test("stageIndex orders the pipeline and handles the unset case", () => {
  assert.equal(stageIndex("topic"), 0);
  assert.equal(stageIndex("final"), STAGE_KEYS.length - 1);
  assert.equal(stageIndex(null), -1);
  assert.equal(stageIndex("nonsense"), -1);
});

test("only real stages validate", () => {
  assert.ok(isValidStage("draft"));
  assert.ok(!isValidStage("submitted"));
  assert.ok(!isValidStage(7));
});

test("orals are timed, written work is counted in words", () => {
  assert.equal(lengthUnitFor(1), "minutes");
  assert.equal(lengthUnitFor(4), "words");
});

test("lengthFraction reports overrun rather than capping at full", () => {
  assert.equal(lengthFraction(1100, 2200), 0.5);
  assert.equal(lengthFraction(2640, 2200), 1.2); // 20% over — must be visible
  assert.equal(lengthFraction(null, 2200), null);
  assert.equal(lengthFraction(500, null), null);
  assert.equal(lengthFraction(500, 0), null);
});

test("criteria totals separate what is scored from what exists", () => {
  const t = criteriaTotals([
    { maxMark: 6, selfMark: 5 },
    { maxMark: 6, selfMark: 3 },
    { maxMark: 6, selfMark: null },
    { maxMark: 6, selfMark: null },
  ]);
  assert.equal(t.scored, 8);
  assert.equal(t.scoredMax, 12, "only the scored criteria count toward scoredMax");
  assert.equal(t.totalMax, 24, "totalMax covers every criterion");
  assert.equal(t.assessedCount, 2);
  assert.equal(t.criterionCount, 4);
});

test("criteria totals on an empty list are all zero, not NaN", () => {
  const t = criteriaTotals([]);
  assert.equal(t.scored, 0);
  assert.equal(t.totalMax, 0);
  assert.equal(t.criterionCount, 0);
});

test("criterion names and mark ceilings are validated", () => {
  assert.equal(validateCriterion("Data analysis", 6), null);
  assert.ok(validateCriterion("", 6));
  assert.ok(validateCriterion("   ", 6));
  assert.ok(validateCriterion("Fine", 0));
  assert.ok(validateCriterion("Fine", 2.5));
  assert.ok(validateCriterion("Fine", 101));
});

test("a self mark cannot exceed its criterion, but can be cleared", () => {
  assert.equal(validateSelfMark(4, 6), null);
  assert.equal(validateSelfMark(6, 6), null);
  assert.equal(validateSelfMark(null, 6), null, "clearing a score is allowed");
  assert.ok(validateSelfMark(7, 6));
  assert.ok(validateSelfMark(-1, 6));
  assert.ok(validateSelfMark(3.5, 6));
});
