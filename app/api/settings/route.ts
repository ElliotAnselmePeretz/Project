import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";
import { encrypt } from "@/lib/crypto";
import { isPlausibleFeedUrl } from "@/lib/managebac";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, token.userId));
  // Never return the URL itself — it is a bearer secret. Only whether one is set.
  return NextResponse.json({
    managebacConfigured: Boolean(user?.managebacUrlEnc),
    lastSyncedAt: user?.lastSyncedAt ?? null,
  });
}

export async function PUT(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { managebacUrl } = await req.json();

  if (managebacUrl === null) {
    await db
      .update(schema.users)
      .set({ managebacUrlEnc: null })
      .where(eq(schema.users.id, token.userId));
    return NextResponse.json({ managebacConfigured: false });
  }

  if (typeof managebacUrl !== "string" || !isPlausibleFeedUrl(managebacUrl)) {
    return NextResponse.json(
      { error: "That does not look like a ManageBac subscribe URL (expected https://…managebac.com/…)." },
      { status: 400 },
    );
  }

  await db
    .insert(schema.users)
    .values({ id: token.userId, managebacUrlEnc: encrypt(managebacUrl) })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: { managebacUrlEnc: encrypt(managebacUrl) },
    });

  return NextResponse.json({ managebacConfigured: true });
}
