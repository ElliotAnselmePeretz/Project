import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { TokOverview } from "@/components/features/tok/TokOverview";
import { Page, PageHeader, LinkButton } from "@/components/ui";

export default async function TheoryOfKnowledge() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Theory of knowledge"
          subtitle="Two pieces of work, done months apart. Open one to track it."
          action={
            <LinkButton href="/tok/about" className="whitespace-nowrap">
              About TOK
            </LinkButton>
          }
        />
        <TokOverview />
      </Page>
    </AppShell>
  );
}
