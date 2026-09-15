import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { EeManager } from "@/components/features/ee/EeManager";
import { Page, PageHeader } from "@/components/ui";

export default async function ExtendedEssay() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Extended essay"
          subtitle="Your independent research project — one question, one subject, the whole diploma to write it."
        />
        <EeManager />
      </Page>
    </AppShell>
  );
}
