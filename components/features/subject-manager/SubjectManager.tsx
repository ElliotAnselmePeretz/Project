"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Banner } from "@/components/ui";
import { defaultAssessmentLabel } from "@/lib/ia";
import { GradesPanel } from "./GradesPanel";
import { GoalsPanel } from "./GoalsPanel";
import { NotesPanel } from "./NotesPanel";
import type { SubjectData } from "./types";

export function SubjectManager({ group }: { group: number }) {
  const [data, setData] = useState<SubjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/subjects/${group}`);
    const body = await res.json();
    if (!res.ok) {
      setLoadError(body.error ?? "Could not load this subject");
      setData(null);
    } else {
      setLoadError("");
      setData(body);
    }
    setLoading(false);
  }, [group]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (loadError) return <Banner tone="danger">{loadError}</Banner>;
  if (!data) return null;

  return (
    // `stagger` is the design system's entrance motion: panels arrive one after
    // another, and it respects prefers-reduced-motion globally.
    <div className="stagger space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-fg">{data.subject.name}</h2>
        <Badge tone={data.subject.level === "HL" ? "accent" : "neutral"}>{data.subject.level}</Badge>
        <Link
          href={`/subjects/${group}/ia`}
          className="ml-auto text-sm font-medium text-accent hover:underline"
        >
          {defaultAssessmentLabel(group)} →
        </Link>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <GradesPanel
        group={group}
        assessments={data.assessments}
        targetGrade={data.targetGrade}
        onChanged={load}
        onError={setError}
      />
      <GoalsPanel group={group} goals={data.goals} onChanged={load} onError={setError} />
      <NotesPanel group={group} notes={data.notes} onChanged={load} onError={setError} />
    </div>
  );
}
