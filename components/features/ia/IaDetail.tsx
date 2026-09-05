"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Banner, LinkButton } from "@/components/ui";
import { isOralGroup } from "@/lib/ia";
import { IaStages } from "./IaStages";
import { IaDetails } from "./IaDetails";
import { IaCriteria } from "./IaCriteria";
import { IaFeedbackLog } from "./IaFeedbackLog";
import type { IaData } from "./types";

export function IaDetail({ group }: { group: number }) {
  const [data, setData] = useState<IaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/subjects/${group}/ia`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(body.error ?? "Could not load this assessment");
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

  async function setStage(stage: string | null) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/subjects/${group}/ia`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error ?? "Could not update the stage");
      else await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (loadError) return <Banner tone="danger">{loadError}</Banner>;
  if (!data) return null;

  const isOral = isOralGroup(group);

  return (
    <div className="stagger space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-fg">{data.subject.name}</h2>
        <Badge tone={data.subject.level === "HL" ? "accent" : "neutral"}>{data.subject.level}</Badge>
        <Badge tone="info">{data.label}</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <LinkButton href={`/subjects/${group}/ia/about`} size="lg">
          About this {data.label}
        </LinkButton>
        <LinkButton href={`/subjects/${group}`} size="lg">
          Grades, goals &amp; notes
        </LinkButton>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <IaStages group={group} stage={data.ia?.stage ?? null} busy={busy} onPick={setStage} />

      <IaDetails
        group={group}
        ia={data.ia}
        lengthUnit={data.lengthUnit}
        isOral={isOral}
        onSaved={load}
        onError={setError}
      />

      <IaCriteria group={group} criteria={data.criteria} onChanged={load} onError={setError} />

      <IaFeedbackLog group={group} feedback={data.feedback} onChanged={load} onError={setError} />
    </div>
  );
}
