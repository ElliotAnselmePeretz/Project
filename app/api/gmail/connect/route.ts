import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/user-request";
import { STATE_COOKIE, authorizationUrl, gmailConfigured } from "@/lib/gmail";

/** Starts the Google consent screen. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.redirect(new URL("/", req.url));

  if (!gmailConfigured()) {
    return NextResponse.redirect(new URL("/settings?gmail=not-configured", req.url));
  }

  // A random value checked again on the way back, so a link someone else
  // crafted cannot attach their Google account to this student.
  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(authorizationUrl(req.nextUrl.origin, state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/gmail",
    maxAge: 600,
  });
  return res;
}
