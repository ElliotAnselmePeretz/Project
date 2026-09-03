import { extractDeadline } from "./extract";
import type { NewDeadline } from "./db/schema";

const GRAPH = "https://graph.microsoft.com/v1.0";

interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime: string;
  webLink?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
}

/**
 * Fetch recent mail and derive candidate deadlines from it.
 *
 * We request only the fields we need. `bodyPreview` (~255 chars) is used rather
 * than full bodies: it is enough for date extraction and means we never pull
 * entire message contents across the network or into the database.
 */
export async function fetchOutlookDeadlines(
  accessToken: string,
  userId: string,
  opts: { sinceDays?: number; limit?: number } = {},
): Promise<{ deadlines: NewDeadline[]; scanned: number }> {
  const since = new Date(Date.now() - (opts.sinceDays ?? 30) * 86_400_000).toISOString();
  const params = new URLSearchParams({
    $select: "id,subject,bodyPreview,receivedDateTime,webLink,from",
    $filter: `receivedDateTime ge ${since}`,
    $orderby: "receivedDateTime desc",
    $top: String(Math.min(opts.limit ?? 100, 200)),
  });

  const res = await fetch(`${GRAPH}/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Microsoft rejected the request. On a school account this usually means an " +
        "admin has not consented to Mail.Read for this app.",
    );
  }
  if (!res.ok) throw new Error(`Microsoft Graph returned ${res.status}`);

  const messages: GraphMessage[] = (await res.json()).value ?? [];
  const deadlines: NewDeadline[] = [];

  for (const m of messages) {
    const receivedAt = new Date(m.receivedDateTime);
    const hit = extractDeadline(m.subject ?? "", m.bodyPreview ?? "", receivedAt);
    if (!hit) continue;

    const sender = m.from?.emailAddress?.name || m.from?.emailAddress?.address || "Unknown sender";
    deadlines.push({
      id: `ol_${m.id.slice(-24)}`,
      userId,
      title: m.subject?.trim() || "(no subject)",
      description: `From ${sender} — matched "${hit.matchedText}"`,
      dueAt: hit.dueAt,
      source: "outlook",
      sourceKey: `outlook:${m.id}`,
      sourceUrl: m.webLink ?? null,
      confidence: hit.confidence,
    });
  }

  return { deadlines, scanned: messages.length };
}
