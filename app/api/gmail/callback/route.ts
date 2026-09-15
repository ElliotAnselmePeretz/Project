import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { encrypt } from "@/lib/crypto";
import { STATE_COOKIE, exchangeCode, getProfileEmail } from "@/lib/gmail";

function back(req: NextRequest, status: string) {
  const res = NextResponse.redirect(new URL(`/settings?gmail=${status}`, req.url));
  res.cookies.delete({ name: STATE_COOKIE, path: "/api/gmail" });
  return res;
}

/** Where Google sends the student after the consent screen. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.redirect(new URL("/", req.url));

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return back(req, "denied");

  const expected = req.cookies.get(STATE_COOKIE)?.value;
  if (!expected || params.get("state") !== expected) return back(req, "error");

  const code = params.get("code");
  if (!code) return back(req, "error");

  try {
    const tokens = await exchangeCode(code, req.nextUrl.origin);
    // Without a refresh token the connection would die within the hour.
    if (!tokens.refresh_token) return back(req, "error");

    const email = await getProfileEmail(tokens.access_token);
    const values = {
      userId: auth.userId,
      email,
      refreshTokenEnc: encrypt(tokens.refresh_token),
      needsReconnect: false,
      connectedAt: new Date(),
    };

    await db
      .insert(schema.gmailConnections)
      .values(values)
      .onConflictDoUpdate({ target: schema.gmailConnections.userId, set: values });

    return back(req, "connected");
  } catch {
    return back(req, "error");
  }
}
