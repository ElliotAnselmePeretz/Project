import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOut } from "@/components/layout/SignIn";
import { AppShell } from "@/components/layout/AppShell";
import { Page, PageHeader, EmptyState, Card, CardBody } from "@/components/ui";

const STRANDS = [
  { name: "Creativity", hint: "Arts, and experiences that involve creative thinking." },
  { name: "Activity", hint: "Physical exertion — sport, training, anything active." },
  { name: "Service", hint: "Unpaid work that responds to a real community need." },
];

export default async function Cas() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <AppShell email={session.user?.email} action={<SignOut />}>
      <Page>
        <PageHeader
          title="CAS"
          subtitle="Creativity, Activity, Service — the experiences and project you log across the diploma."
        />

        <div className="stagger space-y-3">
          {STRANDS.map((strand) => (
            <Card key={strand.name}>
              <CardBody>
                <h3 className="font-medium text-fg">{strand.name}</h3>
                <p className="mt-0.5 text-sm text-muted">{strand.hint}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="mt-4">
          <EmptyState
            title="Nothing logged yet"
            hint="Logging experiences, hours, learning outcomes and reflections is being built next."
          />
        </div>
      </Page>
    </AppShell>
  );
}
