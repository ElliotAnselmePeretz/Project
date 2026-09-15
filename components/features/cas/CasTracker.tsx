"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
} from "@/components/ui";
import { CAS_STRANDS, STRAND_META, casTotals, strandsOf, type CasStrand } from "@/lib/cas";

interface Activity {
  id: string;
  title: string;
  description: string | null;
  hours: number;
  creativity: boolean;
  activity: boolean;
  service: boolean;
  isProject: boolean;
  happenedAt: string | null;
}

const TEXTAREA =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint transition-colors hover:border-border-strong";

const BLANK = {
  title: "",
  hours: "",
  description: "",
  happenedAt: "",
  strands: [] as CasStrand[],
  isProject: false,
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Hours are shown without a trailing ".0" when whole. */
function hours(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function CasTracker() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [form, setForm] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/cas/activities");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error ?? "Could not load your activities");
    setActivities(res.ok ? (body.activities ?? []) : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(method: string, body?: unknown, query = "") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/cas/activities${query}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save that");
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const ok = await send("POST", {
      title: form.title,
      hours: form.hours === "" ? 0 : Number(form.hours),
      description: form.description,
      happenedAt: form.happenedAt || null,
      strands: form.strands,
      isProject: form.isProject,
    });
    if (ok) {
      setForm(BLANK);
      setAdding(false);
    }
  }

  function toggleStrand(strand: CasStrand) {
    setForm((f) => ({
      ...f,
      strands: f.strands.includes(strand)
        ? f.strands.filter((s) => s !== strand)
        : [...f.strands, strand],
    }));
  }

  if (activities === null) return <p className="text-sm text-muted">Loading…</p>;

  const totals = casTotals(activities);
  const hasProject = activities.some((a) => a.isProject);

  return (
    <div className="stagger space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {CAS_STRANDS.map((strand) => (
              <div key={strand}>
                <p className="text-2xl font-semibold tabular-nums text-fg">
                  {hours(totals.byStrand[strand])}
                </p>
                <p className="text-xs text-muted">{STRAND_META[strand].label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-sm">
            <span className="text-muted">
              <strong className="font-medium text-fg">{hours(totals.totalHours)}</strong> hours total
            </span>
            <span className="text-muted">
              <strong className="font-medium text-fg">{totals.activityCount}</strong>{" "}
              {totals.activityCount === 1 ? "activity" : "activities"}
            </span>
            <Badge tone={hasProject ? "success" : "neutral"}>
              {hasProject ? "Project logged" : "No project yet"}
            </Badge>
          </div>

          {totals.activityCount > 0 && (
            <p className="text-xs text-faint">
              An activity in two strands counts toward both, so the strand hours can add up to more
              than the total.
            </p>
          )}
        </CardBody>
      </Card>

      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader
          title="Your activities"
          subtitle="Everything you've done, and roughly how long it took."
          action={
            <Button size="sm" onClick={() => setAdding((v) => !v)} disabled={busy}>
              {adding ? "Cancel" : "Add activity"}
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {adding && (
            <div className="space-y-3 rounded-md border border-border bg-surface-alt p-3">
              <Field label="What was it?">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Coaching the under-14s football team"
                />
              </Field>

              <div>
                <p className="mb-1.5 text-sm font-medium text-fg">Strands</p>
                <div className="flex flex-wrap gap-1.5">
                  {CAS_STRANDS.map((strand) => {
                    const on = form.strands.includes(strand);
                    return (
                      <label
                        key={strand}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                          on
                            ? "border-accent bg-accent-soft font-medium text-accent"
                            : "border-border text-muted hover:border-border-strong"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleStrand(strand)}
                          className="sr-only"
                        />
                        {STRAND_META[strand].label}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-muted">Pick more than one if it counts for more than one.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Hours">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    placeholder="0"
                  />
                </Field>
                <Field label="When">
                  <Input
                    type="date"
                    value={form.happenedAt}
                    onChange={(e) => setForm({ ...form, happenedAt: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Notes" hint="What you did, and what you got out of it.">
                <textarea
                  rows={2}
                  className={TEXTAREA}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>

              <label className="flex items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={form.isProject}
                  onChange={(e) => setForm({ ...form, isProject: e.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                This is my CAS project
              </label>

              <Button
                variant="primary"
                size="sm"
                onClick={add}
                disabled={busy || !form.title.trim() || form.strands.length === 0}
              >
                {busy ? "Saving…" : "Save activity"}
              </Button>
            </div>
          )}

          {activities.length === 0 ? (
            <EmptyState
              title="Nothing logged yet"
              hint="Add anything you've done — it doesn't have to be finished to count."
            />
          ) : (
            <ul className="divide-y divide-border">
              {activities.map((a) => {
                const when = formatDate(a.happenedAt);
                return (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-medium text-fg">{a.title}</p>
                        {a.isProject && <Badge tone="accent">Project</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {strandsOf(a).map((s) => (
                          <Badge key={s} tone="info">
                            {STRAND_META[s].label}
                          </Badge>
                        ))}
                        {when && <span className="text-xs text-faint">{when}</span>}
                      </div>
                      {a.description && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">
                          {a.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm tabular-nums text-fg">{hours(a.hours)}h</span>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={busy}
                        onClick={() => send("DELETE", undefined, `?id=${encodeURIComponent(a.id)}`)}
                      >
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
    </div>
  );
}
