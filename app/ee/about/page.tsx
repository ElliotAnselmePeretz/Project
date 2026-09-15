import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { EeAbout } from "@/components/features/ee/EeAbout";
import { Page, PageHeader } from "@/components/ui";

export default async function EeAboutPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="About the EE"
          subtitle="What the extended essay involves."
          back={{ href: "/ee", label: "Extended essay" }}
        />
        <EeAbout />
      </Page>
    </AppShell>
  );
}
