/**
 * Talking to Gmail: the OAuth handshake, refreshing access, and reading
 * messages. Only `fetch` — no Google SDK — so the whole flow stays readable.
 *
 * Scope is gmail.readonly: the app can read mail and nothing else. It never
 * sends, deletes or labels anything.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

/** Holds the anti-forgery value between starting and finishing the Google sign-in. */
export const STATE_COOKIE = "gmail_oauth_state";

export function gmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Must match an "Authorized redirect URI" in the Google Cloud console exactly. */
export function redirectUri(origin: string): string {
  const base = process.env.AUTH_URL?.replace(/\/$/, "") || origin;
  return `${base}/api/gmail/callback`;
}

export function authorizationUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GMAIL_SCOPE,
    // offline + consent is what makes Google return a refresh token, so the
    // app can keep syncing without the student signing in every hour.
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

/** Google's refresh token was revoked or expired — the student must connect again. */
export class GmailReconnectNeeded extends Error {
  constructor() {
    super("Gmail access has expired. Connect Gmail again in Settings.");
  }
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...body,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // invalid_grant is Google's answer for a revoked or expired refresh token —
    // including the weekly expiry that apps in "Testing" mode are subject to.
    if (data.error === "invalid_grant") throw new GmailReconnectNeeded();
    throw new Error(`Google token request failed: ${data.error_description ?? data.error ?? res.status}`);
  }
  return data as { access_token: string; refresh_token?: string; expires_in: number };
}

export function exchangeCode(code: string, origin: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin) });
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const data = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  return data.access_token;
}

export async function revokeToken(token: string): Promise<void> {
  // Best effort: disconnecting locally matters more than Google acknowledging it.
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
}

async function api<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) throw new GmailReconnectNeeded();
  if (!res.ok) throw new Error(`Gmail request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function getProfileEmail(accessToken: string): Promise<string> {
  const data = await api<{ emailAddress: string }>(accessToken, "/profile");
  return data.emailAddress;
}

/** Message ids matching a Gmail search, newest first, up to `limit`. */
export async function searchMessageIds(accessToken: string, query: string, limit = 100): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ q: query, maxResults: String(Math.min(100, limit - ids.length)) });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await api<{ messages?: { id: string }[]; nextPageToken?: string }>(
      accessToken,
      `/messages?${params}`,
    );
    ids.push(...(data.messages ?? []).map((m) => m.id));
    pageToken = data.nextPageToken;
  } while (pageToken && ids.length < limit);
  return ids;
}

/* ------------------------------------------------------ message parsing */

export interface GmailPart {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}

export interface GmailMessage {
  id: string;
  internalDate?: string;
  payload?: GmailPart;
}

export function getMessage(accessToken: string, id: string): Promise<GmailMessage> {
  return api<GmailMessage>(accessToken, `/messages/${encodeURIComponent(id)}?format=full`);
}

/** Gmail encodes bodies as base64url. */
export function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

export function header(message: GmailMessage, name: string): string {
  const found = message.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found?.value ?? "";
}

/**
 * The first part of a given type, searching nested multiparts depth-first.
 * Emails are often multipart/alternative inside multipart/mixed.
 */
function findPart(part: GmailPart | undefined, mimeType: string): GmailPart | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

/** Plain text preferred; HTML returned raw (flagged) for the caller to convert. */
export function messageBody(message: GmailMessage): { text: string; isHtml: boolean } {
  const plain = findPart(message.payload, "text/plain");
  if (plain?.body?.data) return { text: decodeBase64Url(plain.body.data), isHtml: false };
  const html = findPart(message.payload, "text/html");
  if (html?.body?.data) return { text: decodeBase64Url(html.body.data), isHtml: true };
  return { text: "", isHtml: false };
}

export function receivedAt(message: GmailMessage): Date {
  const ms = Number(message.internalDate);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms) : new Date();
}
