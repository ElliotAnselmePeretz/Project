import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { CasAbout } from "@/components/features/cas/CasAbout";
import { Page, PageHeader } from "@/components/ui";

export default async function CasAboutPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader title="About CAS" subtitle="What CAS involves." back={{ href: "/cas", label: "CAS" }} />
        <CasAbout />
      </Page>
    </AppShell>
  );
}
