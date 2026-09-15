import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { TokAbout } from "@/components/features/tok/TokAbout";
import { Page, PageHeader } from "@/components/ui";

export default async function TokAboutPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="About TOK"
          subtitle="What the exhibition and the essay involve."
          back={{ href: "/tok", label: "TOK" }}
        />
        <TokAbout />
      </Page>
    </AppShell>
  );
}
