"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Banner, Card, CardBody, EmptyState } from "@/components/ui";
import { SUBJECT_GROUPS } from "@/lib/ib-subjects";
import { defaultAssessmentLabel } from "@/lib/ia";

interface Subject {
  groupNumber: number;
  subjectName: string;
  level: "HL" | "SL";
}

const GROUP_NAMES: Map<number, string> = new Map(SUBJECT_GROUPS.map((g) => [g.number, g.name]));

export function IaOverview() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects ?? []))
      .catch(() => setSubjects([]));
  }, []);

  if (subjects === null) return <p className="text-sm text-muted">Loading…</p>;

  if (subjects.length === 0) {
    return (
      <EmptyState
        title="No subjects yet"
        hint="Choose your six DP subjects in Settings and their assessments appear here."
      />
    );
  }

  const ordered = [...subjects].sort((a, b) => a.groupNumber - b.groupNumber);

  return (
    <div className="space-y-4">
      <Banner tone="info">
        These are the six internal assessments you have to produce. Tracking — deadlines, drafts,
        word counts and reflections — is being built next.
      </Banner>

      <div className="stagger space-y-2">
        {ordered.map((s) => {
          const label = defaultAssessmentLabel(s.groupNumber);
          return (
            <Card key={s.groupNumber}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                    Group {s.groupNumber} · {GROUP_NAMES.get(s.groupNumber)}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <h3 className="font-medium text-fg">{s.subjectName}</h3>
                    <Badge tone={s.level === "HL" ? "accent" : "neutral"}>{s.level}</Badge>
                    <Badge tone="info">{label}</Badge>
                  </div>
                </div>
                <Link
                  href={`/subjects/${s.groupNumber}`}
                  className="shrink-0 text-sm font-medium text-accent hover:underline"
                >
                  Open subject →
                </Link>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Groups 1 and 2 are assessed orally, so they show <strong>IOA</strong> rather than IA. Schools
        name this differently (IO, IOA, IOC) — you&rsquo;ll be able to rename it per subject.
      </p>
    </div>
  );
}
