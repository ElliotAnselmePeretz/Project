import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { TokComponentManager } from "@/components/features/tok/TokComponentManager";
import { Page, PageHeader } from "@/components/ui";
import { isValidComponent, COMPONENT_META } from "@/lib/tok";

export default async function TokComponentPage({
  params,
}: {
  params: Promise<{ component: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { component } = await params;
  if (!isValidComponent(component)) notFound();

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title={`TOK ${COMPONENT_META[component].label.toLowerCase()}`}
          subtitle={COMPONENT_META[component].blurb}
          back={{ href: "/tok", label: "TOK" }}
        />
        <TokComponentManager component={component} />
      </Page>
    </AppShell>
  );
}
