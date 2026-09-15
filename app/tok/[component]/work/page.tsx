import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { WorkGoals } from "@/components/features/work/WorkGoals";
import { WorkNotes } from "@/components/features/work/WorkNotes";
import { TokPredicted } from "@/components/features/tok/TokPredicted";
import { Page, PageHeader } from "@/components/ui";
import { isValidComponent, COMPONENT_META, scopeForComponent } from "@/lib/tok";
import type { WorkScope } from "@/lib/work";

export default async function TokWorkPage({ params }: { params: Promise<{ component: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");

  const { component } = await params;
  if (!isValidComponent(component)) notFound();

  const label = COMPONENT_META[component].label.toLowerCase();
  const scope = scopeForComponent(component) as WorkScope;

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Goals, notes & predicted"
          subtitle={`Everything you're working on for the TOK ${label}.`}
          back={{ href: `/tok/${component}`, label: `TOK ${label}` }}
        />
        <div className="stagger space-y-5">
          <TokPredicted component={component} />
          <WorkGoals scope={scope} hint={`What you're breaking the ${label} into.`} />
          <WorkNotes scope={scope} hint="Ideas, sources and things worth coming back to." />
        </div>
      </Page>
    </AppShell>
  );
}
