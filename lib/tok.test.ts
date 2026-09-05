import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TOK_COMPONENTS,
  isValidComponent,
  COMPONENT_META,
  stagesForComponent,
  TOK_STAGE_KEYS,
  isValidTokStage,
  tokStageIndex,
  OBJECT_SLOTS,
  isValidObjectSlot,
  objectsChosen,
  TOK_GRADES,
  isValidTokGrade,
  scopeForComponent,
} from "./tok.ts";
import { isValidScope } from "./work.ts";

test("TOK has exactly two components", () => {
  assert.deepEqual([...TOK_COMPONENTS], ["exhibition", "essay"]);
  assert.ok(isValidComponent("essay"));
  assert.ok(!isValidComponent("about"), "the about page must not resolve as a component");
  assert.ok(!isValidComponent(""));
});

test("each component knows how it is marked", () => {
  assert.match(COMPONENT_META.exhibition.marking, /internal/i);
  assert.match(COMPONENT_META.essay.marking, /external/i);
});

test("the title field means different things per component", () => {
  assert.notEqual(COMPONENT_META.exhibition.titleLabel, COMPONENT_META.essay.titleLabel);
  assert.match(COMPONENT_META.essay.titleLabel, /prescribed/i);
});

test("both components share stage keys but not wording", () => {
  const ex = stagesForComponent("exhibition");
  const es = stagesForComponent("essay");
  assert.deepEqual(
    ex.map((s) => s.key),
    es.map((s) => s.key),
    "shared keys keep a stored stage valid across rewording",
  );
  assert.notEqual(ex[1].label, es[1].label);
  assert.equal(ex[1].label, "Objects chosen");
  assert.equal(es[1].label, "Outline planned");
});

test("only real stages validate, and order is stable", () => {
  assert.ok(isValidTokStage("draft"));
  assert.ok(!isValidTokStage("viva"));
  assert.equal(tokStageIndex("prompt"), 0);
  assert.equal(tokStageIndex("final"), TOK_STAGE_KEYS.length - 1);
  assert.equal(tokStageIndex(null), -1);
});

test("the exhibition takes exactly three object slots", () => {
  assert.deepEqual([...OBJECT_SLOTS], [1, 2, 3]);
  assert.ok(isValidObjectSlot(1));
  assert.ok(isValidObjectSlot(3));
  assert.ok(!isValidObjectSlot(0));
  assert.ok(!isValidObjectSlot(4));
  assert.ok(!isValidObjectSlot("2"));
});

test("objectsChosen counts only slots with a real name", () => {
  assert.equal(objectsChosen([]), 0);
  assert.equal(
    objectsChosen([
      { slot: 1, name: "My grandmother's passport" },
      { slot: 2, name: "   " },
      { slot: 3, name: null },
    ]),
    1,
    "whitespace and null are not a chosen object",
  );
  assert.equal(
    objectsChosen([
      { slot: 1, name: "a" },
      { slot: 2, name: "b" },
      { slot: 3, name: "c" },
    ]),
    3,
  );
});

test("objectsChosen ignores slots outside the three", () => {
  assert.equal(objectsChosen([{ slot: 9, name: "sneaky" }]), 0);
});

test("TOK is graded A to E", () => {
  assert.deepEqual([...TOK_GRADES], ["A", "B", "C", "D", "E"]);
  assert.ok(isValidTokGrade("C"));
  assert.ok(!isValidTokGrade("7"));
});

test("each component maps to its own work scope", () => {
  assert.equal(scopeForComponent("exhibition"), "tok-exhibition");
  assert.equal(scopeForComponent("essay"), "tok-essay");
  // Both must be scopes the work routes actually serve.
  assert.ok(isValidScope(scopeForComponent("exhibition")));
  assert.ok(isValidScope(scopeForComponent("essay")));
});

test("the two components do not share a scope", () => {
  assert.notEqual(scopeForComponent("exhibition"), scopeForComponent("essay"));
});
