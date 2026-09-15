"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Banner, Card, CardBody } from "@/components/ui";
import { daysUntil, relativeDay } from "@/lib/dashboard";
import { MonthCalendar } from "./MonthCalendar";
import { AgendaCard, ClassUpdatesCard, CoreCard, GoalsCard, SubjectsCard } from "./DashboardCards";
import type { DashboardData } from "./types";

function Stat({ href, value, label, tone = "text-fg" }: { href: string; value: string; label: string; tone?: string }) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:border-border-strong">
        <CardBody>
          <p className={`truncate text-2xl font-semibold tabular-nums tracking-tight ${tone}`}>{value}</p>
          <p className="mt-0.5 text-xs text-muted">{label}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

/**
 * The home page. A read-only overview of everything else — every number and
 * row links to the page where that thing is actually edited.
 */
export function HomeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) setError(body.error ?? "Could not load your dashboard");
        else setData(body);
      })
      .catch(() => setError("Could not load your dashboard"));
  }, []);

  if (error) return <Banner tone="danger">{error}</Banner>;
  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  const now = new Date();
  const overdue = data.agenda.filter((i) => daysUntil(new Date(i.dueAt), now) < 0).length;
  const next = data.agenda.find((i) => daysUntil(new Date(i.dueAt), now) >= 0);
  const hours = data.core.cas.totalHours;

  return (
    <div className="stagger space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {overdue > 0 ? (
          <Stat href="/deadlines" value={`${overdue} overdue`} label="Past their due date" tone="text-danger" />
        ) : (
          <Stat
            href={next?.href ?? "/deadlines"}
            value={next ? relativeDay(new Date(next.dueAt), now) : "All clear"}
            label={next ? `Next: ${next.title}` : "Nothing due"}
          />
        )}
        <Stat href="/subjects" value={String(data.openGoalCount)} label="Open goals" />
        <Stat
          href="/cas"
          value={`${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`}
          label="CAS logged"
        />
        <Stat href="/ee" value={data.core.ee?.predictedGrade ?? "—"} label="EE predicted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AgendaCard items={data.agenda} />
        <MonthCalendar items={data.calendar} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GoalsCard goals={data.goals} total={data.openGoalCount} />
        <CoreCard core={data.core} />
      </div>

      <ClassUpdatesCard updates={data.updates} unread={data.unreadUpdateCount} />

      <SubjectsCard subjects={data.subjects} />
    </div>
  );
}
