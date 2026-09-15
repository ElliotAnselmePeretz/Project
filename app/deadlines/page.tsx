import { redirect } from "next/navigation";
import { getSession, isLocalMode } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/components/features/deadlines/Dashboard";
import { Page, PageHeader, Banner } from "@/components/ui";

/**
 * The deadline list, moved here from "/" when the home page became the
 * dashboard. Content is unchanged — same stats, pet panel and list.
 */
export default async function Deadlines() {
  const session = await getSession();
  if (!session) redirect("/");

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

          <Dashboard />
        </div>
      </Page>
    </AppShell>
  );
}
