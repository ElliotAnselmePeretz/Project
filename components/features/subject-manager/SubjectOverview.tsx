"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui";
import { SUBJECT_GROUPS } from "@/lib/ib-subjects";

interface SubjectSummary {
  groupNumber: number;
  subjectName: string;
  level: "HL" | "SL";
  targetGrade: number | null;
  averagePercent: number | null;
  assessmentCount: number;
  openGoalCount: number;
}

const GROUP_NAMES: Map<number, string> = new Map(SUBJECT_GROUPS.map((g) => [g.number, g.name]));

export function SubjectOverview() {
  const [subjects, setSubjects] = useState<SubjectSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/subjects?summary=1")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects ?? []))
      .catch(() => setSubjects([]));
  }, []);

  if (subjects === null) return <p className="text-sm text-muted">Loading…</p>;

  if (subjects.length === 0) {
    return (
      <EmptyState
        title="No subjects yet"
        hint="Choose your six DP subjects in Settings, then they'll appear here."
      />
    );
  }

  const ordered = [...subjects].sort((a, b) => a.groupNumber - b.groupNumber);

  return (
    <div className="stagger grid gap-3 sm:grid-cols-2">
      {ordered.map((s) => (
        <Link key={s.groupNumber} href={`/subjects/${s.groupNumber}`} className="block">
          <Card className="h-full transition-colors hover:border-border-strong">
            <CardBody className="flex h-full flex-col gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                  Group {s.groupNumber} · {GROUP_NAMES.get(s.groupNumber)}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <h3 className="font-medium text-fg">{s.subjectName}</h3>
                  <Badge tone={s.level === "HL" ? "accent" : "neutral"}>{s.level}</Badge>
                </div>
              </div>

              <dl className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <div className="flex items-center gap-1.5">
                  <dt className="text-muted">Average</dt>
                  <dd className="font-medium tabular-nums text-fg">
                    {s.averagePercent === null ? "—" : `${s.averagePercent.toFixed(0)}%`}
                  </dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="text-muted">Target</dt>
                  <dd className="font-medium tabular-nums text-fg">{s.targetGrade ?? "—"}</dd>
                </div>
                {s.openGoalCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <dt className="text-muted">Goals</dt>
                    <dd className="font-medium tabular-nums text-fg">{s.openGoalCount} open</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
