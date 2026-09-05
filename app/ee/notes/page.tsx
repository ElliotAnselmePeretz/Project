import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { WorkNotes } from "@/components/features/work/WorkNotes";
import { Page, PageHeader } from "@/components/ui";

export default async function EeNotes() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Extended essay notes"
          subtitle="Reading, sources and anything worth keeping."
          back={{ href: "/ee", label: "Extended essay" }}
        />
        <WorkNotes scope="ee" hint="Sources, quotes, and things you want to come back to." />
      </Page>
    </AppShell>
  );
}
