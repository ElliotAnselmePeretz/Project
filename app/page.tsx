import { getSession, isLocalMode, microsoftConfigured } from "@/lib/session";
import { SignIn, SignOut } from "@/components/layout/SignIn";
import { SetupNeeded } from "@/components/layout/SetupNeeded";
import { AppShell } from "@/components/layout/AppShell";
import { DeadlineList } from "@/components/features/deadlines/DeadlineList";
import { Page, PageHeader, Banner } from "@/components/ui";

export default async function Home() {
  const session = await getSession();

  // Only a deployed build should ever demand Microsoft setup; locally the app runs without it.
  if (!session && !microsoftConfigured) return <SetupNeeded />;

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-lg font-bold text-accent-fg">
          S
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Studybase</h1>
          <p className="mt-2 text-sm text-muted">
            Your ManageBac deadlines, your IB subjects, and anything due in your inbox.
          </p>
        </div>
        <SignIn />
        <p className="text-xs text-faint">
          Read-only access to your mail and calendar.
        </p>
      </main>
    );
  }

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader title="Deadlines" subtitle="Everything due, from ManageBac and your inbox." />

        <div className="space-y-4">
          {isLocalMode && (
            <Banner tone="accent">
              <strong>Local mode.</strong> Microsoft sign-in is off, so this is a shared local
              account. ManageBac works; Outlook needs Azure credentials in <code>.env</code>.
            </Banner>
          )}

          {session.error === "RefreshFailed" && (
            <Banner tone="danger">
              Your Microsoft session expired. Sign out and back in to resume syncing.
            </Banner>
          )}

          <DeadlineList />
        </div>
      </Page>
    </AppShell>
  );
}
