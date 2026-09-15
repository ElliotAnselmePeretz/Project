import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { Page, PageHeader, EmptyState } from "@/components/ui";

export default async function Extracurricular() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Extracurricular"
          subtitle="Everything outside the diploma — clubs, sport, competitions, jobs, volunteering."
        />
        <EmptyState
          title="Nothing added yet"
          hint="This is for the things CAS doesn't cover but universities ask about. Adding activities, roles and dates is being built next."
        />
      </Page>
    </AppShell>
  );
}
