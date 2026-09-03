import ical, { type VEvent } from "node-ical";
import type { NewDeadline } from "./db/schema";

/**
 * ManageBac exposes a per-user iCal subscription URL
 * (My Workspace -> View Full Calendar -> Subscribe to Calendar).
 *
 * Two limits worth remembering, both imposed by ManageBac and not by us:
 *  - one-way, read-only: nothing we do here can write back
 *  - the feed only spans ~1 month back to ~3 months forward
 */
export function isPlausibleFeedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "webcal:") return false;
    return u.hostname.endsWith("managebac.com") || u.hostname.endsWith("managebac.cn");
  } catch {
    return false;
  }
}

export async function fetchManagebacDeadlines(
  feedUrl: string,
  userId: string,
): Promise<NewDeadline[]> {
  const httpUrl = feedUrl.replace(/^webcal:/i, "https:");

  const res = await fetch(httpUrl, {
    headers: { Accept: "text/calendar" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`ManageBac feed returned ${res.status}. Re-copy the subscribe URL and try again.`);
  }

  const events = ical.sync.parseICS(await res.text());
  const out: NewDeadline[] = [];

  for (const component of Object.values(events)) {
    if (!component || component.type !== "VEVENT") continue;
    const value = component as VEvent;
    if (!value.start) continue;

    const summary = typeof value.summary === "string" ? value.summary : String(value.summary ?? "");
    out.push({
      id: `mb_${hash(`${userId}:${value.uid}`)}`,
      userId,
      title: summary.trim() || "Untitled ManageBac item",
      description: typeof value.description === "string" ? value.description.trim() || null : null,
      dueAt: new Date(value.start),
      source: "managebac",
      sourceKey: `managebac:${value.uid}`,
      sourceUrl: typeof value.url === "string" ? value.url : null,
      confidence: 1, // an explicit calendar date needs no guessing
    });
  }
  return out;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
