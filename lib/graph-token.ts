import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

/**
 * Reads the Graph access token from the encrypted session cookie.
 *
 * Deliberately NOT exposed on the client session object — an access token in
 * the browser is an access token in every XSS payload. Server routes only.
 */
export async function getGraphToken(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, salt: "authjs.session-token" });
  if (!token) return null;
  return {
    accessToken: token.accessToken as string | undefined,
    userId: token.oid as string | undefined,
    error: token.error as string | undefined,
  };
}
