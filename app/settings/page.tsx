import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { ManagebacForm } from "@/components/features/deadlines/ManagebacForm";
import { SubjectSelection } from "@/components/features/subjects/SubjectSelection";
import { Page, PageHeader } from "@/components/ui";

export default async function Settings() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader title="Settings" back={{ href: "/" }} />
        <div className="space-y-10">
          <SubjectSelection />
          <ManagebacForm />
        </div>
      </Page>
    </AppShell>
  );
}
