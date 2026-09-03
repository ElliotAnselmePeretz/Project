"use client";

import { useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Select } from "@/components/ui";
import { averagePercent, percentOf, MIN_GRADE, MAX_GRADE } from "@/lib/subject-manager";
import type { Assessment } from "./types";

interface Props {
  group: number;
  assessments: Assessment[];
  targetGrade: number | null;
  onChanged: () => void;
  onError: (message: string) => void;
}

const BLANK = { title: "", mark: "", maxMark: "", weight: "" };

export function GradesPanel({ group, assessments, targetGrade, onChanged, onError }: Props) {
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const average = averagePercent(assessments);

  async function addAssessment() {
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`/api/subjects/${group}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Could not add that");
        return;
      }
      setForm(BLANK);
      setAdding(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/subjects/${group}/assessments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function setTarget(value: string) {
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`/api/subjects/${group}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetGrade: value === "" ? null : Number(value) }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Could not save the target");
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Grades"
        subtitle="Every test, IA and mock you log here feeds the average."
        action={
          <Button size="sm" onClick={() => setAdding((v) => !v)} disabled={busy}>
            {adding ? "Cancel" : "Add mark"}
          </Button>
        }
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm text-muted">Target grade</span>
            <Select
              value={targetGrade ?? ""}
              onChange={(e) => setTarget(e.target.value)}
              disabled={busy}
              className="w-20"
            >
              <option value="">—</option>
              {Array.from({ length: MAX_GRADE - MIN_GRADE + 1 }, (_, i) => MIN_GRADE + i).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Average</span>
            {average === null ? (
              <span className="text-sm text-faint">no marks yet</span>
            ) : (
              <Badge tone="accent">{average.toFixed(1)}%</Badge>
            )}
          </div>
        </div>

        {adding && (
          <div className="space-y-3 rounded-md border border-border bg-surface-alt p-3">
            <Input
              placeholder="What was it? e.g. Paper 1 mock"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Mark"
                value={form.mark}
                onChange={(e) => setForm({ ...form, mark: e.target.value })}
              />
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Out of"
                value={form.maxMark}
                onChange={(e) => setForm({ ...form, maxMark: e.target.value })}
              />
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Weight (opt.)"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <Button variant="primary" size="sm" onClick={addAssessment} disabled={busy}>
              {busy ? "Saving…" : "Save mark"}
            </Button>
          </div>
        )}

        {assessments.length === 0 ? (
          <EmptyState title="No marks logged yet" hint="Add one and your average appears here." />
        ) : (
          <ul className="divide-y divide-border">
            {assessments.map((a) => {
              const pct = percentOf(a.mark, a.maxMark);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{a.title}</p>
                    <p className="text-xs text-muted">
                      {a.mark}/{a.maxMark}
                      {a.weight != null && ` · weight ${a.weight}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {pct !== null && <span className="text-sm tabular-nums text-fg">{pct.toFixed(0)}%</span>}
                    <Button variant="danger" size="sm" onClick={() => remove(a.id)} disabled={busy}>
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
