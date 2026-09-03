import { auth } from "./auth";

/**
 * Microsoft sign-in is OPTIONAL.
 *
 * With no Azure credentials the app runs in local mode: a single shared local
 * account, no sign-in, ManageBac only. Add the credentials to .env and real
 * per-user Microsoft sign-in switches on by itself — no code changes.
 *
 * Local mode never applies to a production build. Faking a session on a
 * deployed site would hand every visitor the same account, so a production
 * build with no credentials shows the setup screen instead.
 */
export const microsoftConfigured =
  Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID) &&
  Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET);

export const isProduction = process.env.NODE_ENV === "production";

/** Local mode: dev, and either no Microsoft config or an explicit override. */
export const isLocalMode =
  !isProduction && (!microsoftConfigured || process.env.DEV_PREVIEW === "1");

export const LOCAL_USER_ID = "local-user";

export async function getSession() {
  if (isLocalMode) {
    return {
      user: { name: "Local user", email: "local@localhost" },
      userId: LOCAL_USER_ID,
      error: undefined,
    };
  }
  return auth();
}
