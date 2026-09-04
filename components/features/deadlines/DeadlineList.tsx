"use client";

import { useCallback, useEffect, useState } from "react";
import { BUCKET_LABELS, BUCKET_ORDER, bucketFor, daysBetween, type Bucket } from "@/lib/deadline-utils";
import { AddDeadline } from "./AddDeadline";
import { Badge, Banner, Button, Card, EmptyState, SectionTitle } from "@/components/ui";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  source: "managebac" | "outlook" | "manual";
  sourceUrl: string | null;
  confidence: number;
  subject: string | null;
}

type View = "open" | "completed";

function dueLabel(iso: string) {
  const due = new Date(iso);
  // Calendar days, matching bucketFor. Counting elapsed hours instead would
  // label something due at 19:00 today as "Tomorrow" while grouping it under
  // Today.
  const days = daysBetween(new Date(), due);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "text-danger" };
  if (days === 0) return { text: "Today", tone: "text-danger" };
  if (days === 1) return { text: "Tomorrow", tone: "text-warning" };
  if (days <= 7) return { text: `In ${days} days`, tone: "text-warning" };
  return {
    text: due.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    tone: "text-muted",
  };
}

const SOURCE_TONE = { managebac: "success", outlook: "info", manual: "accent" } as const;

export function DeadlineList({ onChange }: { onChange?: () => void }) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [view, setView] = useState<View>("open");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (which: View) => {
    const res = await fetch(`/api/deadlines${which === "completed" ? "?view=completed" : ""}`);
    if (res.ok) setDeadlines((await res.json()).deadlines);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(view);
  }, [load, view]);

  const refresh = useCallback(async () => {
    await load(view);
    onChange?.();
  }, [load, view, onChange]);

  async function sync() {
    setSyncing(true);
    setErrors([]);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      setErrors((await res.json()).errors ?? []);
      await refresh();
    } finally {
      setSyncing(false);
    }
  }

  async function setDone(id: string, done: boolean) {
    setDeadlines((cur) => cur.filter((d) => d.id !== id)); // optimistic
    const res = await fetch("/api/deadlines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dismissed: done }),
    });
    const data = await res.json().catch(() => ({}));
    setNotice(
      done
        ? data.mealEarned
          ? "Done — +1 meal for your pet"
          : "Done"
        : "Restored",
    );
    setTimeout(() => setNotice(null), 3000);
    await refresh();
  }

  async function remove(id: string) {
    setDeadlines((cur) => cur.filter((d) => d.id !== id));
    const res = await fetch(`/api/deadlines?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) setErrors([(await res.json()).error]);
    await refresh();
  }

  // Group open items by urgency; completed items are a flat, newest-first list.
  const groups = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: deadlines.filter((d) => bucketFor(new Date(d.dueAt)) === bucket),
  })).filter((g) => g.items.length > 0);

  function row(d: Deadline) {
    const label = dueLabel(d.dueAt);
    return (
      <Card key={d.id} className="transition-colors hover:border-border-strong">
        <li className="flex items-start gap-4 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={SOURCE_TONE[d.source]}>{d.source}</Badge>
              {d.subject && <Badge tone="neutral">{d.subject}</Badge>}
              {d.confidence < 1 && (
                <span className="text-[10px] text-faint" title="Inferred from email text — verify before trusting">
                  suggested · {Math.round(d.confidence * 100)}%
                </span>
              )}
            </div>
            <p className={`mt-1.5 truncate font-medium ${view === "completed" ? "text-muted line-through" : "text-fg"}`}>
              {d.title}
            </p>
            {d.description && <p className="mt-0.5 truncate text-sm text-muted">{d.description}</p>}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {view === "open" && <span className={`text-sm font-semibold ${label.tone}`}>{label.text}</span>}
            <div className="flex items-center gap-1">
              {d.sourceUrl && (
                <a
                  href={d.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface-alt hover:text-fg"
                >
                  Open
                </a>
              )}
              {view === "open" ? (
                <>
                  <button
                    onClick={() => setDone(d.id, true)}
                    title="Marks it done and earns your pet a meal"
                    className="rounded-sm px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface-alt hover:text-fg"
                  >
                    Done
                  </button>
                  {d.source === "manual" && (
                    <button
                      onClick={() => remove(d.id)}
                      className="rounded-sm px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      Delete
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setDone(d.id, false)}
                  className="rounded-sm px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface-alt hover:text-fg"
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        </li>
      </Card>
    );
  }

  return (
    <section>
      <SectionTitle
        action={
          <div className="flex items-center gap-2">
            <AddDeadline onAdded={refresh} />
            <Button onClick={sync} disabled={syncing} size="sm">
              {syncing ? "Syncing…" : "Sync"}
            </Button>
          </div>
        }
      >
        Deadlines
      </SectionTitle>

      {/* Open / Completed */}
      <div className="mb-3 inline-flex rounded-md border border-border bg-surface p-0.5">
        {(["open", "completed"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => {
              setLoading(true);
              setView(v);
            }}
            className={`rounded-sm px-3 py-1 text-xs capitalize transition-all duration-200 ${
              view === v ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-fg"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mb-3">
          <Banner tone="success">{notice}</Banner>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-3 space-y-2">
          {errors.map((e) => (
            <Banner key={e} tone="warning">
              {e}
            </Banner>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : deadlines.length === 0 ? (
        <EmptyState
          title={view === "completed" ? "Nothing completed yet" : "Nothing due"}
          hint={
            view === "completed"
              ? "Finished deadlines collect here, and can be restored."
              : "Add one by hand, or connect ManageBac in Settings and press Sync."
          }
        />
      ) : view === "completed" ? (
        <ul className="stagger space-y-2">{deadlines.map(row)}</ul>
      ) : (
        <div className="space-y-5">
          {groups.map(({ bucket, items }) => (
            <div key={bucket}>
              <h3
                className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
                  bucket === "overdue" ? "text-danger" : "text-faint"
                }`}
              >
                {BUCKET_LABELS[bucket as Bucket]} · {items.length}
              </h3>
              <ul className="stagger space-y-2">{items.map(row)}</ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
