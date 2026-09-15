import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { UpdatesList } from "@/components/features/updates/UpdatesList";
import { Page, PageHeader, LinkButton } from "@/components/ui";

export default async function Updates() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Class updates"
          subtitle="Announcements, grades, comments and changes from your ManageBac emails."
          back={{ href: "/", label: "Dashboard" }}
          action={
            <LinkButton href="/settings" className="whitespace-nowrap">
              Gmail settings
            </LinkButton>
          }
        />
        <UpdatesList />
      </Page>
    </AppShell>
  );
}
