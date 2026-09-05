import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultAssessmentLabel,
  isOralGroup,
  assessmentLabelsByGroup,
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
  assert.deepEqual(
    all.map((a) => a.groupNumber),
    [1, 2, 3, 4, 5, 6],
  );
  assert.equal(all.filter((a) => a.label === ORAL_LABEL).length, 2);
});
