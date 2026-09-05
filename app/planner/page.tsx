import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { Planner } from "@/components/features/daily-study-planner/Planner";
import { Page, PageHeader } from "@/components/ui";

export default async function PlannerPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Daily planner"
          subtitle="Turn today's deadlines and goals into a plan that fits the time you actually have."
        />
        <Planner />
      </Page>
    </AppShell>
  );
}
