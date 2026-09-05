"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Field, Input, Meter } from "@/components/ui";
import { lengthFraction } from "@/lib/ia";
import type { IaRecord } from "./types";

interface Props {
  group: number;
  ia: IaRecord | null;
  lengthUnit: "words" | "minutes";
  isOral: boolean;
  onSaved: () => void;
  onError: (message: string) => void;
}

/** `2026-03-12` for a date input, from whatever the API returned. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function IaDetails({ group, ia, lengthUnit, isOral, onSaved, onError }: Props) {
  const [form, setForm] = useState({
    title: "",
    supervisor: "",
    lengthCount: "",
    lengthLimit: "",
    draftDueAt: "",
    finalDueAt: "",
  });
  const [busy, setBusy] = useState(false);

  // Re-seed whenever the record changes, so a save elsewhere on the page does
  // not leave these inputs showing stale values.
  useEffect(() => {
    setForm({
      title: ia?.title ?? "",
      supervisor: ia?.supervisor ?? "",
      lengthCount: ia?.lengthCount != null ? String(ia.lengthCount) : "",
      lengthLimit: ia?.lengthLimit != null ? String(ia.lengthLimit) : "",
      draftDueAt: toDateInput(ia?.draftDueAt),
      finalDueAt: toDateInput(ia?.finalDueAt),
    });
  }, [ia]);

  async function saveField(field: string, value: string) {
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`/api/subjects/${group}/ia`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value === "" ? null : value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) onError(data.error ?? "Could not save that");
      else onSaved();
    } finally {
      setBusy(false);
    }
  }

  const count = form.lengthCount === "" ? null : Number(form.lengthCount);
  const limit = form.lengthLimit === "" ? null : Number(form.lengthLimit);
  const fraction = lengthFraction(count, limit);
  const over = fraction !== null && fraction > 1;

  return (
    <Card>
      <CardHeader title="Details" subtitle="Saved when you click away from a field." />
      <CardBody className="space-y-4">
        <Field
          label={isOral ? "Text or extract" : "Research question"}
          hint={isOral ? "What you're speaking about." : "The question your essay answers."}
        >
          <Input
            value={form.title}
            disabled={busy}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onBlur={(e) => saveField("title", e.target.value)}
            placeholder={isOral ? "e.g. Extract from Chronicle of a Death Foretold" : "e.g. To what extent…"}
          />
        </Field>

        <Field label="Supervisor">
          <Input
            value={form.supervisor}
            disabled={busy}
            onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
            onBlur={(e) => saveField("supervisor", e.target.value)}
            placeholder="Teacher's name"
          />
        </Field>

        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={isOral ? "Minutes so far" : "Words so far"}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.lengthCount}
                disabled={busy}
                onChange={(e) => setForm({ ...form, lengthCount: e.target.value })}
                onBlur={(e) => saveField("lengthCount", e.target.value)}
              />
            </Field>
            <Field label={`Limit (${lengthUnit})`} hint="Your subject's own limit.">
              <Input
                type="number"
                inputMode="numeric"
                value={form.lengthLimit}
                disabled={busy}
                onChange={(e) => setForm({ ...form, lengthLimit: e.target.value })}
                onBlur={(e) => saveField("lengthLimit", e.target.value)}
              />
            </Field>
          </div>

          {fraction !== null && (
            <div className="mt-2 space-y-1">
              <Meter value={fraction} tone={over ? "danger" : "accent"} label="Length used" />
              <p className={`text-xs ${over ? "text-danger" : "text-muted"}`}>
                {over
                  ? `${count! - limit!} ${lengthUnit} over the limit`
                  : `${limit! - count!} ${lengthUnit} left`}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Draft due">
            <Input
              type="date"
              value={form.draftDueAt}
              disabled={busy}
              onChange={(e) => setForm({ ...form, draftDueAt: e.target.value })}
              onBlur={(e) => saveField("draftDueAt", e.target.value)}
            />
          </Field>
          <Field label="Final due">
            <Input
              type="date"
              value={form.finalDueAt}
              disabled={busy}
              onChange={(e) => setForm({ ...form, finalDueAt: e.target.value })}
              onBlur={(e) => saveField("finalDueAt", e.target.value)}
            />
          </Field>
        </div>
      </CardBody>
    </Card>
  );
}
