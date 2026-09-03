import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

/**
 * Scopes: identity, plus read-only mail and calendar.
 * `offline_access` is what gets us a refresh token — without it the Graph
 * access token dies after ~1 hour and background sync stops working.
 *
 * NOTE: on a school tenant these scopes will very likely trigger
 * "This app requires your admin's approval" until IT grants consent.
 */
const SCOPES = ["openid", "profile", "email", "offline_access", "Mail.Read", "Calendars.Read"].join(" ");

const tenant = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || "common";

async function refresh(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
        client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
        scope: SCOPES,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description ?? "refresh failed");
    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + Number(data.expires_in),
      // Entra rotates refresh tokens; keep the new one when issued.
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    // Surface to the UI so we can prompt a re-sign-in rather than failing silently.
    return { ...token, error: "RefreshFailed" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
      authorization: { params: { scope: SCOPES } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        // `oid` is stable per user per tenant; `sub` is per-app and would change
        // if the app registration is ever recreated.
        token.oid = (profile as { oid?: string } | undefined)?.oid ?? token.sub;
      }
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() < expiresAt * 1000 - 60_000) return token;
      if (!token.refreshToken) return token;
      return refresh(token);
    },
    async session({ session, token }) {
      session.userId = token.oid as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});

// Token shape carried through the JWT callback.
type JWT = Record<string, unknown>;
