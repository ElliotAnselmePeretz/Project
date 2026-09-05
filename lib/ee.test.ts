import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EE_STAGES,
  EE_STAGE_KEYS,
  isValidEeStage,
  eeStageIndex,
  EE_REFLECTIONS,
  REFLECTION_KEYS,
  isValidReflection,
  EE_GRADES,
  isValidEeGrade,
  reflectionsDone,
} from "./ee.ts";
import { isValidScope, WORK_SCOPES } from "./work.ts";

test("EE stages run from choosing a topic to submitting", () => {
  assert.equal(EE_STAGES[0].key, "topic");
  assert.equal(EE_STAGES[EE_STAGES.length - 1].key, "final");
  assert.equal(new Set(EE_STAGE_KEYS).size, EE_STAGE_KEYS.length, "keys must be unique");
});

test("EE stages include a supervisor step that subject IAs do not have", () => {
  assert.ok(EE_STAGE_KEYS.includes("supervisor"));
});

test("only real EE stages validate", () => {
  assert.ok(isValidEeStage("draft"));
  assert.ok(!isValidEeStage("viva"));
  assert.ok(!isValidEeStage(3));
});

test("eeStageIndex orders progress and handles the unset case", () => {
  assert.equal(eeStageIndex("topic"), 0);
  assert.equal(eeStageIndex("final"), EE_STAGE_KEYS.length - 1);
  assert.equal(eeStageIndex(null), -1);
  assert.equal(eeStageIndex("nope"), -1);
});

test("there are exactly three reflections, ending with the viva voce", () => {
  assert.equal(EE_REFLECTIONS.length, 3);
  assert.equal(REFLECTION_KEYS[2], "viva");
  assert.match(EE_REFLECTIONS[2].label, /viva voce/i);
});

test("only real reflection slots validate", () => {
  assert.ok(isValidReflection("interim"));
  assert.ok(!isValidReflection("final"));
});

test("the EE is graded A to E", () => {
  assert.deepEqual([...EE_GRADES], ["A", "B", "C", "D", "E"]);
  assert.ok(isValidEeGrade("A"));
  assert.ok(!isValidEeGrade("7"));
  assert.ok(!isValidEeGrade("F"));
});

test("reflectionsDone counts only slots with real content", () => {
  assert.equal(reflectionsDone([]), 0);
  assert.equal(
    reflectionsDone([
      { sessionKey: "initial", body: "Chose my topic." },
      { sessionKey: "interim", body: "   " },
      { sessionKey: "viva", body: null },
    ]),
    1,
    "whitespace and null do not count as written",
  );
  assert.equal(
    reflectionsDone([
      { sessionKey: "initial", body: "a" },
      { sessionKey: "interim", body: "b" },
      { sessionKey: "viva", body: "c" },
    ]),
    3,
  );
});

test("reflectionsDone ignores unknown session keys", () => {
  assert.equal(reflectionsDone([{ sessionKey: "made-up", body: "text" }]), 0);
});

test("work scopes cover the non-subject areas", () => {
  assert.deepEqual([...WORK_SCOPES], ["ee", "tok", "cas"]);
  assert.ok(isValidScope("ee"));
  assert.ok(!isValidScope("subject:4"));
  assert.ok(!isValidScope(""));
});
