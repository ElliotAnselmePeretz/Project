import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { decrypt } from "@/lib/crypto";
import {
  GmailReconnectNeeded,
  getMessage,
  header,
  messageBody,
  receivedAt,
  refreshAccessToken,
  searchMessageIds,
} from "@/lib/gmail";
import { ingestEmails, type EmailInput } from "@/lib/gmail-ingest";

/** How far back the very first sync looks. */
const FIRST_SYNC_DAYS = 60;

/** Reads new ManageBac emails from the connected Gmail into class updates. */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.userId;

  const [connection] = await db
    .select()
    .from(schema.gmailConnections)
    .where(eq(schema.gmailConnections.userId, userId));

  if (!connection) {
    return NextResponse.json({ error: "Gmail is not connected. Connect it in Settings." }, { status: 400 });
  }

  try {
    const accessToken = await refreshAccessToken(decrypt(connection.refreshTokenEnc));

    // Search the whole message, not just the sender: when Outlook forwards an
    // email, the From line is the school address and "managebac" is only in
    // the body. Overlap by a day so nothing slips between two syncs.
    const since = connection.lastSyncedAt
      ? `after:${Math.floor(connection.lastSyncedAt.getTime() / 1000) - 86_400}`
      : `newer_than:${FIRST_SYNC_DAYS}d`;
    const ids = await searchMessageIds(accessToken, `managebac ${since}`, 150);

    // Skip anything already stored, so repeat syncs cost almost nothing.
    const known = ids.length
      ? await db
          .select({ messageId: schema.classUpdates.messageId })
          .from(schema.classUpdates)
          .where(and(eq(schema.classUpdates.userId, userId), inArray(schema.classUpdates.messageId, ids)))
      : [];
    const knownIds = new Set(known.map((k) => k.messageId));

    const emails: EmailInput[] = [];
    for (const id of ids.filter((i) => !knownIds.has(i))) {
      const message = await getMessage(accessToken, id);
      const body = messageBody(message);
      emails.push({
        messageId: message.id,
        from: header(message, "From"),
        subject: header(message, "Subject"),
        body: body.text,
        bodyIsHtml: body.isHtml,
        receivedAt: receivedAt(message),
      });
    }

    const result = await ingestEmails(userId, emails);

    await db
      .update(schema.gmailConnections)
      .set({ lastSyncedAt: new Date(), needsReconnect: false })
      .where(eq(schema.gmailConnections.userId, userId));

    return NextResponse.json({ checked: ids.length, ...result });
  } catch (e) {
    if (e instanceof GmailReconnectNeeded) {
      await db
        .update(schema.gmailConnections)
        .set({ needsReconnect: true })
        .where(eq(schema.gmailConnections.userId, userId));
      return NextResponse.json({ error: e.message, needsReconnect: true }, { status: 409 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
