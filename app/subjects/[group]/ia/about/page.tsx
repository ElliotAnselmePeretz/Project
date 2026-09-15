import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { IaAbout } from "@/components/features/ia/IaAbout";
import { Page, PageHeader } from "@/components/ui";
import { isValidGroup } from "@/lib/subject-manager";
import { defaultAssessmentLabel } from "@/lib/ia";

export default async function IaAboutPage({ params }: { params: Promise<{ group: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");

  const { group } = await params;
  const groupNumber = Number(group);
  if (!isValidGroup(groupNumber)) notFound();

  const label = defaultAssessmentLabel(groupNumber);

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title={`About this ${label}`}
          subtitle="What this subject's assessment involves."
          back={{ href: `/subjects/${groupNumber}/ia`, label: `Your ${label}` }}
        />
        <IaAbout group={groupNumber} />
      </Page>
    </AppShell>
  );
}
