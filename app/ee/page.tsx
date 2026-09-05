import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { Page, PageHeader, EmptyState, Card, CardBody } from "@/components/ui";

/**
 * The parts of an EE worth tracking. Figures here are the usual ones, but they
 * are defaults to show structure — a student will be able to adjust them, since
 * requirements shift between syllabus versions and schools brief differently.
 */
const PARTS = [
  {
    name: "Research question",
    hint: "The question the essay answers, in one of your subjects.",
  },
  {
    name: "Supervisor",
    hint: "The teacher supervising you, and the meetings you have with them.",
  },
  {
    name: "Reflection sessions",
    hint: "Three formal reflections with your supervisor, the last one being the viva voce.",
  },
  {
    name: "Word count",
    hint: "Up to 4,000 words. Examiners stop reading at the limit.",
  },
];

export default async function ExtendedEssay() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Extended essay"
          subtitle="Your independent research essay — one question, one subject, the whole diploma to write it."
        />

        <div className="stagger space-y-3">
          {PARTS.map((part) => (
            <Card key={part.name}>
              <CardBody>
                <h3 className="font-medium text-fg">{part.name}</h3>
                <p className="mt-0.5 text-sm text-muted">{part.hint}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="mt-4">
          <EmptyState
            title="Nothing set up yet"
            hint="Recording your question, supervisor, drafts and reflections is being built next."
          />
        </div>

        <p className="mt-4 text-xs text-muted">
          Your EE grade combines with{" "}
          <Link href="/tok" className="text-accent hover:underline">
            TOK
          </Link>{" "}
          for up to 3 additional points toward your diploma.
        </p>
      </Page>
    </AppShell>
  );
}
