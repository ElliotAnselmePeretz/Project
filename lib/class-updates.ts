import * as chrono from "chrono-node";

/**
 * Turning a ManageBac notification email into a "class update".
 *
 * Everything here is heuristic. ManageBac's email wording is not documented
 * and can change, so classification works on keywords rather than exact
 * templates, and anything that does not match lands in "other" rather than
 * being dropped. Pure functions only — no network, no database.
 */

export const UPDATE_KINDS = ["task", "change", "grade", "comment", "announcement", "event", "other"] as const;
export type UpdateKind = (typeof UPDATE_KINDS)[number];

export const KIND_META: Record<UpdateKind, { label: string }> = {
  task: { label: "Task" },
  change: { label: "Changed" },
  grade: { label: "Grade" },
  comment: { label: "Comment" },
  announcement: { label: "Announcement" },
  event: { label: "Event" },
  other: { label: "Update" },
};

/**
 * Checked in order, first match wins. Order matters: "a comment on your task"
 * is a comment, and "the due date for Essay was changed" is a change, not a
 * new task — so the more specific kinds come first.
 */
const RULES: { kind: UpdateKind; pattern: RegExp }[] = [
  { kind: "comment", pattern: /\b(comment(ed|s)?|repl(y|ied))\b/i },
  { kind: "grade", pattern: /\b(grade[ds]?|mark(ed|s)?|scores?|results?|feedback|assessed)\b/i },
  { kind: "change", pattern: /\b(changed|updated|rescheduled|postponed|extended|moved)\b/i },
  { kind: "task", pattern: /\b(tasks?|assignments?|homework|due|deadline|submit|submission|dropbox)\b/i },
  { kind: "announcement", pattern: /\b(announcement|message|posted|news|reminder|notice)\b/i },
  { kind: "event", pattern: /\b(events?|meeting|trip|conference|parents'? evening|excursion)\b/i },
];

/** Classifies on the subject first, since that is where the intent usually is. */
export function classifyUpdate(subject: string, body: string): UpdateKind {
  for (const source of [subject, body.slice(0, 600)]) {
    for (const rule of RULES) {
      if (rule.pattern.test(source)) return rule.kind;
    }
  }
  return "other";
}

/** Kinds where a due date in the email is worth extracting. */
export function carriesDueDate(kind: UpdateKind): boolean {
  return kind === "task" || kind === "change";
}

/**
 * Whether an email came from ManageBac. Checks the body too: when Outlook
 * forwards a message, the From line becomes the student's school address and
 * ManageBac only appears in the forwarded content.
 */
export function isManagebacEmail(from: string, subject: string, body: string): boolean {
  return /managebac/i.test(`${from}\n${subject}\n${body}`);
}

/** Removes "Fwd:", "FW:", "RE:" prefixes, however many are stacked. */
export function cleanSubject(subject: string): string {
  return subject.replace(/^(\s*(fwd?|fw|re)\s*:\s*)+/i, "").trim() || "(no subject)";
}

/** Turns an HTML email body into readable plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // Inline formatting joins its text to what surrounds it; a space here would
    // turn "<b>Economics</b>." into "Economics .".
    .replace(/<\/?(b|strong|i|em|u|span|a|font)\b[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Drops the header block Outlook adds when forwarding ("From: … Sent: … To: …
 * Subject: …"), so it does not become the snippet or confuse date parsing with
 * the date the email was sent.
 */
export function stripForwardHeaders(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*(from|sent|to|cc|date|subject)\s*:/i.test(line))
    .filter((line) => !/^-{2,}\s*(forwarded message|original message)\s*-{2,}$/i.test(line.trim()))
    .join("\n")
    .trim();
}

/**
 * Drops notification-footer lines ("unsubscribe", "manage your notification
 * settings") so they do not fill the snippet. Lines, not sentences: a footer
 * sharing a line with real content is left alone rather than half-cut.
 */
export function stripFooterLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/unsubscribe|notification settings|stop (receiving )?these emails/i.test(line))
    .join("\n")
    .trim();
}

export function makeSnippet(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The most specific date mentioned, for task and change emails.
 *
 * Deliberately not lib/extract.ts: that one rejects anything containing
 * "unsubscribe" or "no-reply" to skip newsletters, and ManageBac notifications
 * contain both. These emails are already known to be school notifications, so
 * that filter would throw every one of them away.
 */
export function extractDueDate(subject: string, body: string, receivedAt: Date): Date | null {
  const results = chrono.parse(`${subject}. ${body}`.slice(0, 4000), receivedAt, { forwardDate: true });
  if (results.length === 0) return null;

  const specificity = (r: chrono.ParsedResult) => {
    const t = r.text.toLowerCase();
    let score = 0;
    if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(t)) score += 3;
    if (/\d{1,2}\s*(st|nd|rd|th)?\b/.test(t)) score += 2;
    if (/\d{1,2}[/-]\d{1,2}/.test(t)) score += 3;
    if (/\b(next|this|last)\s+(week|month|term)\b/.test(t)) score -= 4;
    return score;
  };

  const best = [...results].sort((a, b) => specificity(b) - specificity(a))[0];
  if (specificity(best) <= 0) return null; // too vague to present as a due date

  const date = best.start.date();
  const daysOut = (date.getTime() - receivedAt.getTime()) / 86_400_000;
  return daysOut < -1 || daysOut > 400 ? null : date;
}

/**
 * Which of the student's subjects an email is about, if any. Tries the full
 * name, then the part before a colon ("English A" from "English A:
 * Literature"), then a distinctive first word ("Mathematics").
 */
export function detectSubject(text: string, subjectNames: string[]): string | null {
  const haystack = text.toLowerCase();
  for (const name of subjectNames) {
    if (haystack.includes(name.toLowerCase())) return name;
  }
  for (const name of subjectNames) {
    const short = name.split(":")[0].trim().toLowerCase();
    if (short.length >= 4 && haystack.includes(short)) return name;
  }
  for (const name of subjectNames) {
    const first = name.split(/[\s:]/)[0].toLowerCase();
    if (first.length >= 6 && new RegExp(`\\b${first}\\b`).test(haystack)) return name;
  }
  return null;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * The existing deadline an email is talking about, if any — so a task that is
 * already in Deadlines (from the ManageBac calendar feed) is not offered again.
 * Same day, and one title containing the other once punctuation is ignored.
 */
export function findMatchingDeadline<T extends { id: string; title: string; dueAt: Date }>(
  update: { title: string; dueAt: Date | null },
  deadlines: T[],
): T | null {
  if (!update.dueAt) return null;

  // Notification subjects wrap the real title — "New task: Paper 1 practice" —
  // so also try just the part after the last colon, or the prefix alone would
  // stop it matching "Paper 1 practice" in Deadlines.
  const afterColon = update.title.includes(":") ? update.title.slice(update.title.lastIndexOf(":") + 1) : "";
  const candidates = [update.title, afterColon].map(normalizeTitle).filter((t) => t.length >= 4);
  if (candidates.length === 0) return null;

  return (
    deadlines.find((d) => {
      if (!sameLocalDay(d.dueAt, update.dueAt!)) return false;
      const other = normalizeTitle(d.title);
      if (other.length < 4) return false;
      return candidates.some((title) => title.includes(other) || other.includes(title));
    }) ?? null
  );
}
