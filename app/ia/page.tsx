import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { IaOverview } from "@/components/features/ia/IaOverview";
import { Page, PageHeader } from "@/components/ui";

export default async function InternalAssessments() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Internal assessments"
          subtitle="One per subject, across the whole diploma."
        />
        <IaOverview />
      </Page>
    </AppShell>
  );
}
