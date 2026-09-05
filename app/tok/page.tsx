import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { Page, PageHeader, EmptyState, Card, CardBody, Badge } from "@/components/ui";

/**
 * TOK's two assessed pieces. Word counts are the usual ones and are shown to
 * give the page shape — they will be editable, since syllabus versions differ.
 */
const COMPONENTS = [
  {
    name: "Exhibition",
    tone: "accent" as const,
    marked: "Internally marked",
    hint: "Three objects and a commentary on how they connect to a prompt. Around 950 words.",
  },
  {
    name: "Essay",
    tone: "info" as const,
    marked: "Externally marked",
    hint: "A response to one of the prescribed titles released for your session. Up to 1,600 words.",
  },
];

export default async function TheoryOfKnowledge() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="Theory of knowledge"
          subtitle="How you know what you know — assessed through an exhibition and an essay."
        />

        <div className="stagger space-y-3">
          {COMPONENTS.map((c) => (
            <Card key={c.name}>
              <CardBody>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-fg">{c.name}</h3>
                  <Badge tone={c.tone}>{c.marked}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted">{c.hint}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="mt-4">
          <EmptyState
            title="Nothing set up yet"
            hint="Tracking your objects, prompts, drafts and deadlines is being built next."
          />
        </div>

        <p className="mt-4 text-xs text-muted">
          Your TOK grade combines with your{" "}
          <Link href="/ee" className="text-accent hover:underline">
            extended essay
          </Link>{" "}
          for up to 3 additional points toward your diploma.
        </p>
      </Page>
    </AppShell>
  );
}
