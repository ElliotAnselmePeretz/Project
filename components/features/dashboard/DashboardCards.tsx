"use client";

import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, EmptyState, Meter } from "@/components/ui";
import { KIND_LABELS, daysUntil, relativeDay } from "@/lib/dashboard";
import { KIND_TONES, type AgendaItemJson, type DashboardData, type GoalJson } from "./types";

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-accent hover:underline">
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------- coming up */

export function AgendaCard({ items }: { items: AgendaItemJson[] }) {
  const shown = items.slice(0, 7);

  return (
    <Card>
      <CardHeader title="Coming up" action={<CardLink href="/deadlines">All deadlines →</CardLink>} />
      <CardBody>
        {shown.length === 0 ? (
          <EmptyState
            title="Nothing coming up"
            hint="Deadlines, plus any IA, EE or TOK due dates you set, will show here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((item) => {
              const due = new Date(item.dueAt);
              const days = daysUntil(due);
              const tone = days < 0 ? "text-danger" : days <= 2 ? "text-warning" : "text-muted";
              return (
                <li key={item.id}>
                  <Link href={item.href} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-surface-alt">
                    {/* Fixed-width slot so titles line up whatever the badge says. */}
                    <span className="w-[4.5rem] shrink-0">
                      <Badge tone={KIND_TONES[item.kind]}>{KIND_LABELS[item.kind]}</Badge>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{item.title}</p>
                      {item.context && <p className="truncate text-xs text-muted">{item.context}</p>}
                    </div>
                    <span className={`shrink-0 text-sm tabular-nums ${tone}`}>{relativeDay(due)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/* ----------------------------------------------------------------- goals */

export function GoalsCard({ goals, total }: { goals: GoalJson[]; total: number }) {
  return (
    <Card>
      <CardHeader
        title="Open goals"
        subtitle={total > goals.length ? `Newest ${goals.length} of ${total}` : undefined}
      />
      <CardBody>
        {goals.length === 0 ? (
          <EmptyState title="No open goals" hint="Goals from your subjects, EE, TOK and CAS gather here." />
        ) : (
          <ul className="space-y-1">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Link href={goal.href} className="-mx-2 flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-surface-alt">
                  <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-border-strong" />
                  <span className="min-w-0 flex-1 text-sm text-fg">{goal.text}</span>
                  <span className="shrink-0 text-xs text-muted">{goal.context}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/* --------------------------------------------------------------- DP core */

function CoreRow({ href, name, detail, grade }: { href: string; name: string; detail: string; grade?: string | null }) {
  return (
    <Link href={href} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-surface-alt">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{name}</p>
        <p className="truncate text-xs text-muted">{detail}</p>
      </div>
      {grade !== undefined && (
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-base font-semibold ${
            grade ? "bg-accent-soft text-accent" : "bg-surface-alt text-faint"
          }`}
          title="Predicted grade"
        >
          {grade ?? "—"}
        </span>
      )}
    </Link>
  );
}

export function CoreCard({ core }: { core: DashboardData["core"] }) {
  const { ee, tok, cas } = core;
  const eeWords =
    ee?.wordCount != null && ee?.wordLimit ? Math.round((ee.wordCount / ee.wordLimit) * 100) : null;
  const hours = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <Card>
      <CardHeader title="DP core" />
      <CardBody className="divide-y divide-border py-2">
        <CoreRow
          href="/ee"
          name="Extended essay"
          detail={[ee?.stage ?? "Not started", eeWords != null ? `${eeWords}% of word limit` : null]
            .filter(Boolean)
            .join(" · ")}
          grade={ee?.predictedGrade ?? null}
        />
        {tok.map((t) => (
          <CoreRow
            key={t.component}
            href={`/tok/${t.component}`}
            name={`TOK ${t.label.toLowerCase()}`}
            detail={t.stage ?? "Not started"}
            grade={t.predictedGrade}
          />
        ))}
        <Link href="/cas" className="-mx-2 block rounded-md px-2 py-2.5 hover:bg-surface-alt">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-fg">CAS</p>
            <Badge tone={cas.hasProject ? "success" : "neutral"}>
              {cas.hasProject ? "Project logged" : "No project yet"}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {hours(cas.totalHours)} hours · {hours(cas.byStrand.creativity)} C · {hours(cas.byStrand.activity)} A ·{" "}
            {hours(cas.byStrand.service)} S
          </p>
        </Link>
      </CardBody>
    </Card>
  );
}

/* -------------------------------------------------------------- subjects */

export function SubjectsCard({ subjects }: { subjects: DashboardData["subjects"] }) {
  return (
    <Card>
      <CardHeader title="Subjects" action={<CardLink href="/subjects">Open subjects →</CardLink>} />
      <CardBody>
        {subjects.length === 0 ? (
          <EmptyState title="No subjects yet" hint="Choose your six DP subjects in Settings." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-faint">
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Average</th>
                  <th className="pb-2 font-medium">Target</th>
                  <th className="pb-2 font-medium">Internal assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.map((s) => (
                  <tr key={s.groupNumber}>
                    <td className="py-2.5 pr-3">
                      <Link href={`/subjects/${s.groupNumber}`} className="flex items-center gap-2 hover:underline">
                        <span className="font-medium text-fg">{s.name}</span>
                        <Badge tone={s.level === "HL" ? "accent" : "neutral"}>{s.level}</Badge>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">
                      {s.averagePercent === null ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-9 tabular-nums text-fg">{Math.round(s.averagePercent)}%</span>
                          <Meter value={s.averagePercent / 100} className="w-16" label={`${s.name} average`} />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-fg">{s.targetGrade ?? <span className="text-faint">—</span>}</td>
                    <td className="py-2.5">
                      <Link href={`/subjects/${s.groupNumber}/ia`} className="hover:underline">
                        <span className="text-xs font-medium text-muted">{s.iaLabel}</span>{" "}
                        <span className={s.iaStage ? "text-fg" : "text-faint"}>{s.iaStage ?? "Not started"}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
