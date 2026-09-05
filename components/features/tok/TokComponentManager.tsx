"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Banner, Card, CardBody, CardHeader, Field, Input, LinkButton, Meter } from "@/components/ui";
import { COMPONENT_META, stagesForComponent, tokStageIndex, objectsChosen, type TokComponent } from "@/lib/tok";
import { lengthFraction } from "@/lib/ia";
import { TokObjects } from "./TokObjects";

interface ComponentRow {
  title: string | null;
  stage: string | null;
  wordCount: number | null;
  wordLimit: number | null;
  predictedGrade: string | null;
  draftDueAt: string | null;
  finalDueAt: string | null;
}

interface ObjectRow {
  slot: number;
  name: string | null;
  context: string | null;
  link: string | null;
}

const TEXTAREA =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint transition-colors hover:border-border-strong";

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function TokComponentManager({ component }: { component: TokComponent }) {
  const meta = COMPONENT_META[component];
  const stages = stagesForComponent(component);
  const isExhibition = component === "exhibition";

  const [row, setRow] = useState<ComponentRow | null>(null);
  const [objects, setObjects] = useState<ObjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    wordCount: "",
    wordLimit: "",
    draftDueAt: "",
    finalDueAt: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/tok");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not load TOK");
    } else {
      const found: ComponentRow | undefined = (body.components ?? []).find(
        (c: { component: string }) => c.component === component,
      );
      setRow(found ?? null);
      setObjects(body.objects ?? []);
      setForm({
        title: found?.title ?? "",
        wordCount: found?.wordCount != null ? String(found.wordCount) : "",
        wordLimit: found?.wordLimit != null ? String(found.wordLimit) : "",
        draftDueAt: toDateInput(found?.draftDueAt),
        finalDueAt: toDateInput(found?.finalDueAt),
      });
    }
    setLoading(false);
  }, [component]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/tok/${component}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Could not save that");
      else await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveObject(slot: number, patch: { name: string; context: string; link: string }) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/tok/objects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Could not save that object");
      else await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  const current = tokStageIndex(row?.stage ?? null);
  const count = form.wordCount === "" ? null : Number(form.wordCount);
  const limit = form.wordLimit === "" ? null : Number(form.wordLimit);
  const fraction = lengthFraction(count, limit);
  const over = fraction !== null && fraction > 1;
  const chosen = objectsChosen(objects);

  return (
    <div className="stagger space-y-5">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-accent-soft text-3xl font-semibold text-accent"
            >
              {row?.predictedGrade ?? "—"}
            </span>
            <div>
              <p className="text-sm font-medium text-fg">Predicted grade</p>
              <p className="text-xs text-muted">{row?.predictedGrade ? "Graded A to E" : "Not set yet"}</p>
            </div>
          </div>

          {isExhibition && (
            <div>
              <p className="text-2xl font-semibold tabular-nums text-fg">{chosen}/3</p>
              <p className="text-xs text-muted">objects chosen</p>
            </div>
          )}

          {fraction !== null && (
            <div>
              <p className="text-2xl font-semibold tabular-nums text-fg">
                {Math.round(fraction * 100)}%
              </p>
              <p className="text-xs text-muted">of the word limit</p>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <LinkButton href="/tok/about" size="lg">
          About TOK
        </LinkButton>
        <LinkButton href={`/tok/${component}/work`} size="lg">
          Goals, notes &amp; predicted
        </LinkButton>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader title="Progress" subtitle="Click whichever stage you have reached." />
        <CardBody>
          <ol className="space-y-1">
            {stages.map((s, i) => {
              const done = current > i;
              const here = current === i;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => save({ stage: here ? null : s.key })}
                    disabled={busy}
                    aria-current={here ? "step" : undefined}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                      here
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-muted hover:bg-surface-alt hover:text-fg"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                        done
                          ? "border-accent bg-accent text-accent-fg"
                          : here
                            ? "border-accent text-accent"
                            : "border-border-strong text-faint"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={done ? "text-fg" : undefined}>{s.label}</span>
                    {here && <span className="ml-auto text-xs">you are here</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Details" subtitle="Saved when you click away from a field." />
        <CardBody className="space-y-4">
          <Field label={meta.titleLabel} hint={meta.titleHint}>
            <textarea
              rows={2}
              className={TEXTAREA}
              value={form.title}
              disabled={busy}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onBlur={(e) => save({ title: e.target.value })}
              placeholder={
                isExhibition ? "e.g. What counts as good evidence for a claim?" : "The title you chose"
              }
            />
          </Field>

          <div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Words so far">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.wordCount}
                  disabled={busy}
                  onChange={(e) => setForm({ ...form, wordCount: e.target.value })}
                  onBlur={(e) => save({ wordCount: e.target.value })}
                />
              </Field>
              <Field label="Word limit" hint="Check your own brief.">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.wordLimit}
                  disabled={busy}
                  onChange={(e) => setForm({ ...form, wordLimit: e.target.value })}
                  onBlur={(e) => save({ wordLimit: e.target.value })}
                  placeholder={isExhibition ? "950" : "1600"}
                />
              </Field>
            </div>

            {fraction !== null && (
              <div className="mt-2 space-y-1">
                <Meter value={fraction} tone={over ? "danger" : "accent"} label="Words used" />
                <p className={`text-xs ${over ? "text-danger" : "text-muted"}`}>
                  {over ? `${count! - limit!} words over the limit` : `${limit! - count!} words left`}
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
                onBlur={(e) => save({ draftDueAt: e.target.value })}
              />
            </Field>
            <Field label="Final due">
              <Input
                type="date"
                value={form.finalDueAt}
                disabled={busy}
                onChange={(e) => setForm({ ...form, finalDueAt: e.target.value })}
                onBlur={(e) => save({ finalDueAt: e.target.value })}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {isExhibition && <TokObjects objects={objects} busy={busy} onSave={saveObject} />}

      <p className="text-xs text-muted">
        <Badge tone={isExhibition ? "accent" : "info"}>{meta.marking}</Badge>{" "}
        <span className="ml-1">{meta.blurb}</span>
      </p>
    </div>
  );
}
