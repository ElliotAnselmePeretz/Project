/**
 * IB pet — the rules.
 *
 * Feeding is earned, not free: completing a deadline grants one meal, and a
 * meal is what feeds the pet. The point is to make finishing work feel like it
 * pays for something.
 *
 * Kept free of database and React so it can be tested directly.
 */

export const SPECIES = [
  "nimbus",
  "sprout",
  "ember",
  "pebble",
  "ripple",
  "moth",
  "star",
  "blot",
] as const;
export type Species = (typeof SPECIES)[number];

export interface SpeciesInfo {
  id: Species;
  name: string;
  tagline: string;
  /** Palette token names so each creature sits inside the design system. */
  hue: { body: string; accent: string };
}

export const SPECIES_INFO: Record<Species, SpeciesInfo> = {
  nimbus: {
    id: "nimbus",
    name: "Nimbus",
    tagline: "A drifting cloud. Calm, slow to worry, always overhead.",
    hue: { body: "#8fb8d8", accent: "#5b8fb9" },
  },
  sprout: {
    id: "sprout",
    name: "Sprout",
    tagline: "A stubborn little seedling. Grows a leaf for every deadline met.",
    hue: { body: "#8fc493", accent: "#4f9159" },
  },
  ember: {
    id: "ember",
    name: "Ember",
    tagline: "A small flame. Bright when fed, dim when neglected.",
    hue: { body: "#f0a35e", accent: "#d9702c" },
  },
  pebble: {
    id: "pebble",
    name: "Pebble",
    tagline: "A mossy little stone. Unbothered by almost everything.",
    hue: { body: "#a9a49b", accent: "#79a06a" },
  },
  ripple: {
    id: "ripple",
    name: "Ripple",
    tagline: "A droplet that never quite settles. Wobbles when happy.",
    hue: { body: "#7fc4dd", accent: "#3d92b5" },
  },
  moth: {
    id: "moth",
    name: "Moth",
    tagline: "Drawn to late-night revision lamps. Dusty and loyal.",
    hue: { body: "#c8b6a0", accent: "#8a7460" },
  },
  star: {
    id: "star",
    name: "Star",
    tagline: "Small, bright, and quietly pleased with your progress.",
    hue: { body: "#f2d06b", accent: "#d9a626" },
  },
  blot: {
    id: "blot",
    name: "Blot",
    tagline: "Spilled ink that decided to stay. Fond of essays.",
    hue: { body: "#8b8fb0", accent: "#4d5273" },
  },
};

/** Hunger is 0–100. It falls to zero over two days of neglect. */
export const MAX_HUNGER = 100;
export const HUNGER_EMPTY_HOURS = 48;
const HUNGER_LOST_PER_HOUR = MAX_HUNGER / HUNGER_EMPTY_HOURS;

export const XP_PER_FEED = 10;
export const HUNGER_PER_FEED = 25;

export type Mood = "happy" | "content" | "hungry" | "sad";

/** Hunger after `now`, given the value recorded at `lastFedAt`. */
export function currentHunger(storedHunger: number, lastFedAt: Date, now: Date = new Date()): number {
  const hours = Math.max(0, (now.getTime() - lastFedAt.getTime()) / 3_600_000);
  return clamp(storedHunger - hours * HUNGER_LOST_PER_HOUR, 0, MAX_HUNGER);
}

export function moodFor(hunger: number): Mood {
  if (hunger >= 70) return "happy";
  if (hunger >= 40) return "content";
  if (hunger >= 15) return "hungry";
  return "sad";
}

/**
 * Levels get progressively more expensive: 40 XP for level 2, then 100, 180…
 * Cumulative XP for level n is 20n² − 20n.
 */
export function levelFromXp(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor((20 + Math.sqrt(400 + 80 * xp)) / 40);
}

export function xpForLevel(level: number): number {
  return 20 * level * level - 20 * level;
}

/** Progress towards the next level, 0–1. */
export function levelProgress(xp: number): number {
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return clamp((xp - start) / (next - start), 0, 1);
}

export interface PetState {
  hunger: number;
  xp: number;
  meals: number;
}

/**
 * Spend one meal. Returns the state unchanged (and fed: false) when there is
 * nothing to spend, so callers never have to special-case an empty larder.
 */
export function feed(state: PetState): { state: PetState; fed: boolean } {
  if (state.meals <= 0) return { state, fed: false };
  return {
    fed: true,
    state: {
      meals: state.meals - 1,
      xp: state.xp + XP_PER_FEED,
      hunger: clamp(state.hunger + HUNGER_PER_FEED, 0, MAX_HUNGER),
    },
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
