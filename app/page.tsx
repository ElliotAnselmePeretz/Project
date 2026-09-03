import Link from "next/link";
import { getSession, isPreview } from "@/lib/session";
import { SignIn, SignOut } from "@/components/SignIn";
import { Dashboard } from "@/components/Dashboard";
import { SetupNeeded } from "@/components/SetupNeeded";

export default async function Home() {
  const session = await getSession();

  // Without these, Auth.js sends client_id=undefined and Microsoft answers with
  // a bare "AADSTS900144" page that says nothing about what to fix.
  const configured =
    Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID) &&
    Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET);

  if (!session && !configured && !isPreview) return <SetupNeeded />;

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Deadline Tracker</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Your ManageBac deadlines and anything due in your Outlook mail, in one list.
          </p>
        </div>
        <SignIn />
        <p className="text-xs text-[var(--muted)]">
          Signs you in with your school Microsoft account. Read-only access to mail and calendar.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Deadline Tracker</h1>
          <p className="text-sm text-[var(--muted)]">{session.user?.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/subjects" className="text-sm hover:underline">
            Subjects
          </Link>
          <Link href="/settings" className="text-sm hover:underline">
            Settings
          </Link>
          <SignOut />
        </div>
      </header>

      {isPreview && (
        <p className="mb-4 rounded-lg border border-purple-300 bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-950/30 dark:text-purple-200">
          <strong>Preview mode.</strong> Sign-in is bypassed for local development, so this is
          not a real account. Outlook sync will not work; ManageBac will. Unset{" "}
          <code>DEV_PREVIEW</code> in <code>.env</code> to turn this off.
        </p>
      )}

      {session.error === "RefreshFailed" && (
        <p className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
          Your Microsoft session expired. Sign out and back in to resume syncing.
        </p>
      )}

      <Dashboard />
    </main>
  );
}
