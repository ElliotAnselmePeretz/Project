import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { SubjectManager } from "@/components/features/subject-manager/SubjectManager";
import { Page, PageHeader } from "@/components/ui";
import { SUBJECT_GROUPS } from "@/lib/ib-subjects";
import { isValidGroup } from "@/lib/subject-manager";

export default async function SubjectPage({ params }: { params: Promise<{ group: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");

  const { group } = await params;
  const groupNumber = Number(group);
  if (!isValidGroup(groupNumber)) notFound();

  const groupName = SUBJECT_GROUPS.find((g) => g.number === groupNumber)?.name;

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title={`Group ${groupNumber}`}
          subtitle={groupName}
          back={{ href: "/subjects", label: "All subjects" }}
        />
        <SubjectManager group={groupNumber} />
      </Page>
    </AppShell>
  );
}
