"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Banner, Card, CardBody, CardHeader, Field, Input, LinkButton, Meter, Select } from "@/components/ui";
import { EE_STAGES, EE_REFLECTIONS, EE_GRADES, eeStageIndex, reflectionsDone } from "@/lib/ee";
import { lengthFraction } from "@/lib/ia";
import { SUBJECT_GROUPS } from "@/lib/ib-subjects";

interface Essay {
  title: string | null;
  researchQuestion: string | null;
  subject: string | null;
  topic: string | null;
  supervisor: string | null;
  stage: string | null;
  wordCount: number | null;
  wordLimit: number | null;
  predictedGrade: string | null;
  draftDueAt: string | null;
  finalDueAt: string | null;
}

interface Reflection {
  sessionKey: string;
  body: string | null;
  heldAt: string | null;
}

const ALL_SUBJECTS = SUBJECT_GROUPS.flatMap((g) => g.options).filter(
  (name) => !name.startsWith("None"),
);

const TEXTAREA =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint transition-colors hover:border-border-strong";

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function EeManager() {
  const [essay, setEssay] = useState<Essay | null>(null);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    researchQuestion: "",
    subject: "",
    topic: "",
    supervisor: "",
    wordCount: "",
    wordLimit: "",
    draftDueAt: "",
    finalDueAt: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/ee");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not load your extended essay");
    } else {
      setEssay(body.essay);
      setReflections(body.reflections ?? []);
      const e: Essay | null = body.essay;
      setForm({
        title: e?.title ?? "",
        researchQuestion: e?.researchQuestion ?? "",
        subject: e?.subject ?? "",
        topic: e?.topic ?? "",
        supervisor: e?.supervisor ?? "",
        wordCount: e?.wordCount != null ? String(e.wordCount) : "",
        wordLimit: e?.wordLimit != null ? String(e.wordLimit) : "",
        draftDueAt: toDateInput(e?.draftDueAt),
        finalDueAt: toDateInput(e?.finalDueAt),
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ee", {
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

  async function saveReflection(sessionKey: string, body: string, heldAt: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ee/reflections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey, body, heldAt: heldAt || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Could not save that reflection");
      else await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  const current = eeStageIndex(essay?.stage ?? null);
  const count = form.wordCount === "" ? null : Number(form.wordCount);
  const limit = form.wordLimit === "" ? null : Number(form.wordLimit);
  const fraction = lengthFraction(count, limit);
  const over = fraction !== null && fraction > 1;
  const done = reflectionsDone(reflections);

  return (
    <div className="stagger space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {essay?.predictedGrade && <Badge tone="accent">Predicted {essay.predictedGrade}</Badge>}
        <Badge tone={done === 3 ? "success" : "neutral"}>{done}/3 reflections</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <LinkButton href="/ee/goals" size="lg">
          Goals
        </LinkButton>
        <LinkButton href="/ee/notes" size="lg">
          Notes
        </LinkButton>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader title="Progress" subtitle="Click whichever stage you have reached." />
        <CardBody>
          <ol className="space-y-1">
            {EE_STAGES.map((s, i) => {
              const finished = current > i;
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
                        finished
                          ? "border-accent bg-accent text-accent-fg"
                          : here
                            ? "border-accent text-accent"
                            : "border-border-strong text-faint"
                      }`}
                    >
                      {finished ? "✓" : i + 1}
                    </span>
                    <span className={finished ? "text-fg" : undefined}>{s.label}</span>
                    {here && <span className="ml-auto text-xs">you are here</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your project" subtitle="Saved when you click away from a field." />
        <CardBody className="space-y-4">
          <Field label="Working title">
            <Input
              value={form.title}
              disabled={busy}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onBlur={(e) => save({ title: e.target.value })}
              placeholder="What you're calling it for now"
            />
          </Field>

          <Field label="Research question" hint="The question the essay answers.">
            <textarea
              rows={2}
              className={TEXTAREA}
              value={form.researchQuestion}
              disabled={busy}
              onChange={(e) => setForm({ ...form, researchQuestion: e.target.value })}
              onBlur={(e) => save({ researchQuestion: e.target.value })}
              placeholder="e.g. To what extent…"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject" hint="The subject it's registered in.">
              <Select
                value={form.subject}
                disabled={busy}
                onChange={(e) => {
                  setForm({ ...form, subject: e.target.value });
                  save({ subject: e.target.value });
                }}
              >
                <option value="">Not chosen yet</option>
                {ALL_SUBJECTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Topic" hint="The area within that subject.">
              <Input
                value={form.topic}
                disabled={busy}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                onBlur={(e) => save({ topic: e.target.value })}
                placeholder="e.g. Enzyme kinetics"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Supervisor">
              <Input
                value={form.supervisor}
                disabled={busy}
                onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
                onBlur={(e) => save({ supervisor: e.target.value })}
                placeholder="Teacher's name"
              />
            </Field>

            <Field label="Predicted grade" hint="The EE is graded A to E.">
              <Select
                value={essay?.predictedGrade ?? ""}
                disabled={busy}
                onChange={(e) => save({ predictedGrade: e.target.value || null })}
              >
                <option value="">—</option>
                {EE_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

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
              <Field label="Word limit" hint="Usually 4,000 — check your brief.">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.wordLimit}
                  disabled={busy}
                  onChange={(e) => setForm({ ...form, wordLimit: e.target.value })}
                  onBlur={(e) => save({ wordLimit: e.target.value })}
                  placeholder="4000"
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

      <Card>
        <CardHeader
          title="Reflection sessions"
          subtitle="Three formal conversations with your supervisor. The last is the viva voce."
        />
        <CardBody className="space-y-4">
          {EE_REFLECTIONS.map((session) => {
            const saved = reflections.find((r) => r.sessionKey === session.key);
            return (
              <ReflectionSlot
                key={session.key}
                label={session.label}
                hint={session.hint}
                body={saved?.body ?? ""}
                heldAt={toDateInput(saved?.heldAt)}
                busy={busy}
                onSave={(body, heldAt) => saveReflection(session.key, body, heldAt)}
              />
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

function ReflectionSlot({
  label,
  hint,
  body,
  heldAt,
  busy,
  onSave,
}: {
  label: string;
  hint: string;
  body: string;
  heldAt: string;
  busy: boolean;
  onSave: (body: string, heldAt: string) => void;
}) {
  const [text, setText] = useState(body);
  const [date, setDate] = useState(heldAt);

  // Re-seed when the saved values change, so a reload does not leave stale text.
  useEffect(() => {
    setText(body);
    setDate(heldAt);
  }, [body, heldAt]);

  const written = body.trim().length > 0;

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-fg">{label}</h3>
        {written && <Badge tone="success">Written</Badge>}
      </div>
      <p className="mt-0.5 text-sm text-muted">{hint}</p>

      <textarea
        rows={3}
        className={`${TEXTAREA} mt-2`}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== body) onSave(text, date);
        }}
        placeholder="What you discussed, and where it left you…"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted" htmlFor={`held-${label}`}>
          Held on
        </label>
        <Input
          id={`held-${label}`}
          type="date"
          value={date}
          disabled={busy}
          onChange={(e) => {
            setDate(e.target.value);
            onSave(text, e.target.value);
          }}
          className="w-auto"
        />
      </div>
    </div>
  );
}
