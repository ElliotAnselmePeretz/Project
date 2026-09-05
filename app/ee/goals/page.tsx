import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { WorkGoals } from "@/components/features/work/WorkGoals";
import { Page, PageHeader } from "@/components/ui";

export default async function EeGoals() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Extended essay goals"
          subtitle="What you're breaking the essay into."
          back={{ href: "/ee", label: "Extended essay" }}
        />
        <WorkGoals scope="ee" hint="Break a 4,000-word project into pieces you can actually finish." />
      </Page>
    </AppShell>
  );
}
