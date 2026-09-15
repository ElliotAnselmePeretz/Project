/**
 * Pure helpers behind the dashboard: turning dated things from every corner of
 * the app into one agenda, and laying out a month for the calendar. No
 * database and no React, so the date edge cases can be tested directly.
 */

export type AgendaKind = "deadline" | "ia" | "ee" | "tok";

export interface AgendaItem {
  /** Unique across kinds, so it can key a React list. */
  id: string;
  kind: AgendaKind;
  title: string;
  /** Where it belongs, e.g. "Biology" or "TOK essay". */
  context: string | null;
  dueAt: Date;
  href: string;
}

export const KIND_LABELS: Record<AgendaKind, string> = {
  deadline: "Deadline",
  ia: "IA",
  ee: "EE",
  tok: "TOK",
};

/** Local calendar day as YYYY-MM-DD. Local, not UTC: "today" means the student's today. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Whole calendar days from `from` to `to`; negative when `to` is in the past. */
export function daysUntil(to: Date, from: Date = new Date()): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function relativeDay(to: Date, from: Date = new Date()): string {
  const days = daysUntil(to, from);
  if (days < -1) return `${-days} days ago`;
  if (days === -1) return "Yesterday";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/**
 * The agenda: soonest first, overdue items kept (they are the ones that most
 * need seeing) but only within `lookbackDays`, so something missed months ago
 * does not sit at the top forever.
 */
export function buildAgenda(
  items: AgendaItem[],
  { now = new Date(), lookbackDays = 7 }: { now?: Date; lookbackDays?: number } = {},
): AgendaItem[] {
  const earliest = startOfDay(now).getTime() - lookbackDays * 86_400_000;
  return items
    .filter((item) => !Number.isNaN(item.dueAt.getTime()) && item.dueAt.getTime() >= earliest)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

/** Items grouped by local day, for putting markers on the calendar. */
export function groupByDay(items: AgendaItem[]): Map<string, AgendaItem[]> {
  const map = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const key = dayKey(item.dueAt);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export interface CalendarDay {
  date: Date;
  key: string;
  inMonth: boolean;
}

/**
 * A month as whole weeks, Monday first, padded with the neighbouring months'
 * days so every row has seven cells. Always 5 or 6 rows depending on the month.
 */
export function monthGrid(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1);
  // getDay(): Sunday is 0. Shift so Monday is 0.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);

  const weeks: CalendarDay[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: new Date(cursor), key: dayKey(cursor), inMonth: cursor.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === month);

  return weeks;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
