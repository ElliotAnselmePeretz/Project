import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";
import { fetchManagebacDeadlines } from "@/lib/managebac";
import { fetchOutlookDeadlines } from "@/lib/outlook";
import { decrypt } from "@/lib/crypto";
import type { NewDeadline } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = token.userId;
  const errors: string[] = [];
  let collected: NewDeadline[] = [];

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

  // --- ManageBac ---
  if (user?.managebacUrlEnc) {
    try {
      collected = collected.concat(await fetchManagebacDeadlines(decrypt(user.managebacUrlEnc), userId));
    } catch (e) {
      errors.push(`ManageBac: ${(e as Error).message}`);
    }
  } else {
    errors.push("ManageBac: no calendar feed configured yet — add it in Settings.");
  }

  // --- Outlook ---
  if (token.error) {
    errors.push("Outlook: session expired, please sign in again.");
  } else if (token.accessToken) {
    try {
      const { deadlines } = await fetchOutlookDeadlines(token.accessToken, userId);
      collected = collected.concat(deadlines);
    } catch (e) {
      errors.push(`Outlook: ${(e as Error).message}`);
    }
  }

  // Upsert on (user_id, source_key) so repeated syncs update rather than duplicate,
  // and so a user's dismissal is not resurrected by the next sync.
  for (const d of collected) {
    await db
      .insert(schema.deadlines)
      .values(d)
      .onConflictDoUpdate({
        target: [schema.deadlines.userId, schema.deadlines.sourceKey],
        set: {
          title: d.title,
          description: d.description,
          dueAt: d.dueAt,
          confidence: d.confidence,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .insert(schema.users)
    .values({ id: userId, lastSyncedAt: new Date() })
    .onConflictDoUpdate({ target: schema.users.id, set: { lastSyncedAt: new Date() } });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.deadlines)
    .where(eq(schema.deadlines.userId, userId));

  return NextResponse.json({ imported: collected.length, total: count, errors });
}
