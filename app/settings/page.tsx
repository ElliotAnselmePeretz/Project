import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { ManagebacForm } from "@/components/features/deadlines/ManagebacForm";
import { SubjectSelection } from "@/components/features/subjects/SubjectSelection";
import { GmailConnect } from "@/components/features/gmail/GmailConnect";
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
          {/* Suspense because GmailConnect reads ?gmail= from the URL after Google redirects back. */}
          <Suspense>
            <GmailConnect />
          </Suspense>
        </div>
      </Page>
    </AppShell>
  );
}
