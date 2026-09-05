import type { Purpose } from "./daily-study-planner";

/**
 * Guess a task's purpose from its title.
 *
 * This is a hint only. Callers must keep `purposeConfirmed: false` until the
 * student agrees — a title genuinely cannot determine whether something needs
 * practising, writing or submitting, and acting on a guess as if it were fact
 * is how a planner starts giving confidently wrong advice.
 */
export function guessPurpose(title: string): Purpose {
  const t = title.toLowerCase();
  if (/\b(submit|submission|upload|hand in|turn in|due)\b/.test(t)) return "submit";
  if (/\b(essay|ia\b|ee\b|tok|report|draft|write|writing|commentary|reflection|outline)\b/.test(t)) return "write";
  if (/\b(test|exam|quiz|paper \d|past paper|revision|revise|problem|exercise|practice|practise)\b/.test(t)) {
    return "practise";
  }
  if (/\b(read|learn|study|notes|chapter|lesson|introduction)\b/.test(t)) return "learn";
  return "practise";
}

/** A sensible starting estimate, in minutes, before the student edits it. */
export function defaultEstimate(purpose: Purpose): number {
  return purpose === "write" ? 90 : purpose === "submit" ? 30 : 60;
}
