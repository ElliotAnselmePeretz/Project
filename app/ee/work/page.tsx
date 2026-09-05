import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { WorkGoals } from "@/components/features/work/WorkGoals";
import { WorkNotes } from "@/components/features/work/WorkNotes";
import { EePredicted } from "@/components/features/ee/EePredicted";
import { Page, PageHeader } from "@/components/ui";

export default async function EeWork() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Goals, notes & predicted"
          subtitle="Everything you're working on for the extended essay."
          back={{ href: "/ee", label: "Extended essay" }}
        />
        <div className="stagger space-y-5">
          <EePredicted />
          <WorkGoals scope="ee" hint="Break a 4,000-word project into pieces you can actually finish." />
          <WorkNotes scope="ee" hint="Sources, quotes, and things you want to come back to." />
        </div>
      </Page>
    </AppShell>
  );
}
