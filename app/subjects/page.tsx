import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { SubjectOverview } from "@/components/features/subject-manager/SubjectOverview";
import { Page, PageHeader } from "@/components/ui";

export default async function Subjects() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader title="Subjects" subtitle="Open one to track its grades, goals and notes." />
        <SubjectOverview />
      </Page>
    </AppShell>
  );
}
