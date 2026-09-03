import * as chrono from "chrono-node";

/** Phrases that suggest a message is actually assigning work, not just mentioning a date. */
const DEADLINE_CUES = [
  "due", "deadline", "submit", "submission", "hand in", "turn in",
  "by friday", "by monday", "no later than", "closes", "expires",
  "assignment", "homework", "essay", "draft", "exam", "test", "quiz",
];

const NEGATIVE_CUES = ["unsubscribe", "newsletter", "no-reply", "noreply", "out of office"];

export interface Extracted {
  dueAt: Date;
  confidence: number;
  matchedText: string;
}

/**
 * Pull a probable due date out of an email.
 *
 * This is a heuristic and it will be wrong sometimes — that is why every result
 * carries a confidence score and the UI shows email-derived items as
 * "suggested" rather than as fact.
 */
export function extractDeadline(subject: string, body: string, receivedAt: Date): Extracted | null {
  const haystack = `${subject}\n${body}`.toLowerCase();

  if (NEGATIVE_CUES.some((c) => haystack.includes(c))) return null;

  const cueHits = DEADLINE_CUES.filter((c) => haystack.includes(c)).length;
  if (cueHits === 0) return null;

  // Parse relative dates ("next Tuesday") against when the mail arrived, not now.
  const results = chrono.parse(`${subject}. ${body}`.slice(0, 4000), receivedAt, { forwardDate: true });
  if (results.length === 0) return null;

  const subjectResults = chrono.parse(subject, receivedAt, { forwardDate: true });

  // Prefer the most *specific* date, not the earliest or the one in the subject.
  // "test next week" should lose to "on 15 September" in the same mail.
  //
  // We score the matched text rather than chrono's isCertain(): chrono resolves
  // "next week" to a concrete day and then reports day/month/year as certain,
  // so isCertain cannot tell an explicit date from an inferred one.
  const specificity = (r: chrono.ParsedResult) => {
    const t = r.text.toLowerCase();
    let score = 0;
    if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(t)) score += 3;
    if (/\d{1,2}\s*(st|nd|rd|th)?\b/.test(t)) score += 2;
    if (/\d{1,2}[/-]\d{1,2}/.test(t)) score += 3;
    if (r.start.isCertain("hour")) score += 1;
    if (/\b(next|this|last)\s+(week|month|term)\b/.test(t)) score -= 4; // too vague to trust
    return score;
  };

  const best = [...results].sort((a, b) => specificity(b) - specificity(a))[0];
  const dueAt = best.start.date();

  // A "deadline" in the past, or absurdly far out, is almost always a misparse.
  const daysOut = (dueAt.getTime() - receivedAt.getTime()) / 86_400_000;
  if (daysOut < -1 || daysOut > 400) return null;

  let confidence = 0.3;
  if (specificity(best) >= 5) confidence += 0.25; // explicit day + month name
  if (subjectResults.length > 0) confidence += 0.1;
  if (cueHits >= 2) confidence += 0.15;
  if (best.start.isCertain("hour")) confidence += 0.1;
  if (haystack.includes("due") || haystack.includes("deadline")) confidence += 0.1;

  return {
    dueAt,
    confidence: Math.min(confidence, 0.95), // never claim certainty on inferred data
    matchedText: best.text,
  };
}
