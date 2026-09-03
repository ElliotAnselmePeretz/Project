"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Banner, Button, Card, EmptyState, SectionTitle } from "@/components/ui";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  source: "managebac" | "outlook";
  sourceUrl: string | null;
  confidence: number;
}

function dueLabel(iso: string) {
  const due = new Date(iso);
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "text-danger" };
  if (days === 0) return { text: "Today", tone: "text-danger" };
  if (days === 1) return { text: "Tomorrow", tone: "text-warning" };
  if (days <= 7) return { text: `In ${days} days`, tone: "text-warning" };
  return {
    text: due.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    tone: "text-muted",
  };
}

export function DeadlineList() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meal, setMeal] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/deadlines");
    if (res.ok) setDeadlines((await res.json()).deadlines);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sync() {
    setSyncing(true);
    setErrors([]);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      setErrors((await res.json()).errors ?? []);
      await load();
    } finally {
      setSyncing(false);
    }
  }

  async function dismiss(id: string) {
    setDeadlines((cur) => cur.filter((d) => d.id !== id)); // optimistic
    const res = await fetch("/api/deadlines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dismissed: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.mealEarned) {
      setMeal("+1 meal for your pet");
      setTimeout(() => setMeal(null), 3000);
    }
  }

  return (
    <section>
      <SectionTitle
        action={
          <Button onClick={sync} disabled={syncing} size="sm">
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        }
      >
        Upcoming
      </SectionTitle>

      {meal && (
        <div className="mb-3">
          <Banner tone="success">{meal}</Banner>
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
          title="Nothing due"
          hint="Add your ManageBac feed in Settings, then press Sync now."
        />
      ) : (
        <ul className="stagger space-y-2">
          {deadlines.map((d) => {
            const label = dueLabel(d.dueAt);
            return (
              <Card key={d.id} className="transition-colors hover:border-border-strong">
                <li className="flex items-start gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={d.source === "managebac" ? "success" : "info"}>{d.source}</Badge>
                      {d.confidence < 1 && (
                        <span
                          className="text-[10px] text-faint"
                          title="Inferred from email text — verify before trusting"
                        >
                          suggested · {Math.round(d.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate font-medium text-fg">{d.title}</p>
                    {d.description && <p className="mt-0.5 truncate text-sm text-muted">{d.description}</p>}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`text-sm font-semibold ${label.tone}`}>{label.text}</span>
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
                      <button
                        onClick={() => dismiss(d.id)}
                        title="Marks it done and earns your pet a meal"
                        className="rounded-sm px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface-alt hover:text-fg"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </li>
              </Card>
            );
          })}
        </ul>
      )}
    </section>
  );
}
