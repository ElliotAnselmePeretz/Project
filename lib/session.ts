import { auth } from "./auth";

/**
 * Dev-only preview mode.
 *
 * Lets the app be viewed without a configured Microsoft app registration, so
 * work can be reviewed while Azure/admin consent is still being sorted out.
 *
 * Two locks, both required:
 *   - NODE_ENV must not be "production" — a production build ignores this
 *     entirely, so it cannot be switched on for a deployed site
 *   - DEV_PREVIEW must be explicitly set to "1" in .env (gitignored)
 *
 * It fabricates a session. It does NOT grant Outlook access: there is no real
 * token behind it, so Graph calls still fail. ManageBac sync works normally.
 */
export const isPreview =
  process.env.NODE_ENV !== "production" && process.env.DEV_PREVIEW === "1";

export const PREVIEW_USER_ID = "preview-local-user";

export async function getSession() {
  if (isPreview) {
    return {
      user: { name: "Preview user", email: "preview@localhost" },
      userId: PREVIEW_USER_ID,
      error: undefined,
    };
  }
  return auth();
}
