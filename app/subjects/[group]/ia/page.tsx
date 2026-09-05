import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { IaDetail } from "@/components/features/ia/IaDetail";
import { Page, PageHeader } from "@/components/ui";
import { isValidGroup } from "@/lib/subject-manager";
import { defaultAssessmentLabel } from "@/lib/ia";

export default async function SubjectIaPage({ params }: { params: Promise<{ group: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");

  const { group } = await params;
  const groupNumber = Number(group);
  if (!isValidGroup(groupNumber)) notFound();

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title={defaultAssessmentLabel(groupNumber)}
          subtitle="Everything for this subject's internal assessment."
          back={{ href: "/ia", label: "All assessments" }}
        />
        <IaDetail group={groupNumber} />
      </Page>
    </AppShell>
  );
}
