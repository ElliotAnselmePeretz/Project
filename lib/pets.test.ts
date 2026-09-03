import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currentHunger,
  moodFor,
  levelFromXp,
  xpForLevel,
  levelProgress,
  feed,
  MAX_HUNGER,
} from "./pets.ts";

const NOW = new Date("2026-09-03T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

test("hunger decays over time and bottoms out at zero", () => {
  assert.equal(currentHunger(100, NOW, NOW), 100);
  assert.ok(Math.abs(currentHunger(100, hoursAgo(36), NOW) - 50) < 0.1);
  assert.equal(currentHunger(100, hoursAgo(500), NOW), 0);
});

test("hunger never exceeds the maximum or goes negative", () => {
  assert.ok(currentHunger(MAX_HUNGER, NOW, NOW) <= MAX_HUNGER);
  assert.ok(currentHunger(5, hoursAgo(100), NOW) >= 0);
});

test("a clock skewed into the future does not inflate hunger", () => {
  assert.equal(currentHunger(60, new Date(NOW.getTime() + 90_000_000), NOW), 60);
});

test("mood tracks hunger", () => {
  assert.equal(moodFor(90), "happy");
  assert.equal(moodFor(55), "content");
  assert.equal(moodFor(20), "hungry");
  assert.equal(moodFor(2), "sad");
});

test("levels line up with their XP thresholds", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(39), 1);
  assert.equal(levelFromXp(40), 2);
  assert.equal(levelFromXp(119), 2);
  assert.equal(levelFromXp(120), 3);
  for (const level of [1, 2, 3, 5, 9]) {
    assert.equal(levelFromXp(xpForLevel(level)), level, `level ${level} boundary`);
  }
});

test("level progress runs 0 to 1 within a level", () => {
  assert.equal(levelProgress(xpForLevel(3)), 0);
  const mid = levelProgress((xpForLevel(3) + xpForLevel(4)) / 2);
  assert.ok(mid > 0.4 && mid < 0.6, `expected ~0.5, got ${mid}`);
  assert.ok(levelProgress(xpForLevel(4) - 1) < 1);
});

test("feeding spends a meal and adds xp and hunger", () => {
  const { state, fed } = feed({ hunger: 50, xp: 0, meals: 2 });
  assert.equal(fed, true);
  assert.equal(state.meals, 1);
  assert.equal(state.xp, 10);
  assert.equal(state.hunger, 75);
});

test("feeding with no meals changes nothing", () => {
  const before = { hunger: 50, xp: 30, meals: 0 };
  const { state, fed } = feed(before);
  assert.equal(fed, false);
  assert.deepEqual(state, before);
});

test("feeding a full pet does not push hunger past the maximum", () => {
  const { state } = feed({ hunger: 95, xp: 0, meals: 1 });
  assert.equal(state.hunger, MAX_HUNGER);
});
