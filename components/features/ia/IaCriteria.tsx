"use client";

import { useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Meter } from "@/components/ui";
import { criteriaTotals } from "@/lib/ia";
import type { Criterion } from "./types";

interface Props {
  group: number;
  criteria: Criterion[];
  onChanged: () => void;
  onError: (message: string) => void;
}

const BLANK = { name: "", maxMark: "" };

export function IaCriteria({ group, criteria, onChanged, onError }: Props) {
  const [form, setForm] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const totals = criteriaTotals(criteria);
  const fraction = totals.scoredMax > 0 ? totals.scored / totals.scoredMax : 0;
  const everythingScored = totals.criterionCount > 0 && totals.assessedCount === totals.criterionCount;

  // Weakest is only meaningful once more than one criterion is scored.
  const scored = criteria.filter((c) => c.selfMark !== null);
  const weakest =
    scored.length > 1
      ? scored.reduce((low, c) =>
          c.selfMark! / c.maxMark < low.selfMark! / low.maxMark ? c : low,
        )
      : null;

  async function send(method: string, url: string, body?: unknown) {
    setBusy(true);
    onError("");
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.error ?? "Could not save that");
        return false;
      }
      onChanged();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (await send("POST", `/api/subjects/${group}/ia/criteria`, form)) {
      setForm(BLANK);
      setAdding(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Criteria"
        subtitle="Add the criteria your subject is marked against, then score yourself honestly."
        action={
          <Button size="sm" onClick={() => setAdding((v) => !v)} disabled={busy}>
            {adding ? "Cancel" : "Add criterion"}
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {totals.criterionCount > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Predicted</span>
                <Badge tone={everythingScored ? "accent" : "neutral"}>
                  {totals.scored} / {everythingScored ? totals.totalMax : totals.scoredMax}
                </Badge>
              </div>
              {!everythingScored && (
                <span className="text-xs text-muted">
                  {totals.assessedCount} of {totals.criterionCount} scored ·{" "}
                  {totals.totalMax} marks available in total
                </span>
              )}
            </div>
            <Meter value={fraction} label="Predicted marks" />
          </div>
        )}

        {adding && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-alt p-3 sm:flex-row">
            <Input
              placeholder="Criterion, e.g. Data analysis"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="flex-1"
            />
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Out of"
              value={form.maxMark}
              onChange={(e) => setForm({ ...form, maxMark: e.target.value })}
              className="sm:w-28"
            />
            <Button variant="primary" onClick={add} disabled={busy || !form.name.trim()}>
              Add
            </Button>
          </div>
        )}

        {criteria.length === 0 ? (
          <EmptyState
            title="No criteria yet"
            hint="They differ by subject and syllabus, so add the ones on your own marking sheet."
          />
        ) : (
          <ul className="divide-y divide-border">
            {criteria.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                  {weakest?.id === c.id && <p className="text-xs text-warning">weakest area</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    aria-label={`Your mark for ${c.name}`}
                    value={c.selfMark ?? ""}
                    placeholder="—"
                    disabled={busy}
                    onChange={(e) =>
                      send("PATCH", `/api/subjects/${group}/ia/criteria`, {
                        id: c.id,
                        selfMark: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-16 text-center"
                  />
                  <span className="whitespace-nowrap text-sm tabular-nums text-muted">
                    / {c.maxMark}
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      send("DELETE", `/api/subjects/${group}/ia/criteria?id=${encodeURIComponent(c.id)}`)
                    }
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
