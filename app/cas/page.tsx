import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { CasTracker } from "@/components/features/cas/CasTracker";
import { Page, PageHeader, LinkButton } from "@/components/ui";

export default async function Cas() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="CAS"
          subtitle="Creativity, Activity, Service — what you've done across the diploma."
          action={
            <LinkButton href="/cas/about" className="whitespace-nowrap">
              About CAS
            </LinkButton>
          }
        />
        <CasTracker />
      </Page>
    </AppShell>
  );
}
