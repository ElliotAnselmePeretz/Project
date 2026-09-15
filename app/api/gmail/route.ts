import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { decrypt } from "@/lib/crypto";
import { gmailConfigured, revokeToken } from "@/lib/gmail";

/** Whether Gmail is set up and connected. Never returns the token. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const [connection] = await db
    .select()
    .from(schema.gmailConnections)
    .where(eq(schema.gmailConnections.userId, auth.userId));

  return NextResponse.json({
    configured: gmailConfigured(),
    connected: Boolean(connection),
    email: connection?.email ?? null,
    needsReconnect: connection?.needsReconnect ?? false,
    lastSyncedAt: connection?.lastSyncedAt ?? null,
  });
}

/** Disconnect: tell Google to revoke access, then forget the token. Updates already read are kept. */
export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const [connection] = await db
    .select()
    .from(schema.gmailConnections)
    .where(eq(schema.gmailConnections.userId, auth.userId));

  if (connection) {
    try {
      await revokeToken(decrypt(connection.refreshTokenEnc));
    } catch {
      /* an undecryptable token is still removed below */
    }
    await db.delete(schema.gmailConnections).where(eq(schema.gmailConnections.userId, auth.userId));
  }

  return NextResponse.json({ connected: false });
}
