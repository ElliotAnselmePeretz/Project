"use client";

import { useCallback, useEffect, useState } from "react";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  source: "managebac" | "outlook";
  sourceUrl: string | null;
  confidence: number;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "text-red-600" };
  if (days === 0) return { text: "Today", tone: "text-red-600" };
  if (days === 1) return { text: "Tomorrow", tone: "text-amber-600" };
  if (days <= 7) return { text: `In ${days} days`, tone: "text-amber-600" };
  return { text: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), tone: "text-[var(--muted)]" };
}

export function Dashboard() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const data = await res.json();
      setErrors(data.errors ?? []);
      await load();
    } finally {
      setSyncing(false);
    }
  }

  async function dismiss(id: string) {
    setDeadlines((cur) => cur.filter((d) => d.id !== id)); // optimistic
    await fetch("/api/deadlines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dismissed: true }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        <button
          onClick={sync}
          disabled={syncing}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--card)] disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : deadlines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            Nothing yet. Add your ManageBac feed in Settings, then hit Sync now.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {deadlines.map((d) => {
            const label = dayLabel(d.dueAt);
            return (
              <li
                key={d.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        d.source === "managebac"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                      }`}
                    >
                      {d.source}
                    </span>
                    {d.confidence < 1 && (
                      <span className="text-[10px] text-[var(--muted)]" title="Inferred from email text — verify before trusting">
                        suggested · {Math.round(d.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-medium">{d.title}</p>
                  {d.description && (
                    <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{d.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`text-sm font-medium ${label.tone}`}>{label.text}</span>
                  <div className="flex gap-2">
                    {d.sourceUrl && (
                      <a
                        href={d.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--muted)] hover:underline"
                      >
                        Open
                      </a>
                    )}
                    <button onClick={() => dismiss(d.id)} className="text-xs text-[var(--muted)] hover:underline">
                      Dismiss
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
