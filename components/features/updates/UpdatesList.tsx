"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Banner, Button, Card, CardBody, EmptyState } from "@/components/ui";
import { KIND_META, UPDATE_KINDS, type UpdateKind } from "@/lib/class-updates";
import { relativeDay } from "@/lib/dashboard";

export interface UpdateJson {
  id: string;
  kind: UpdateKind;
  title: string;
  snippet: string | null;
  subject: string | null;
  dueAt: string | null;
  deadlineId: string | null;
  receivedAt: string;
  read: boolean;
}

export const KIND_TONE: Record<UpdateKind, "neutral" | "accent" | "success" | "warning" | "info"> = {
  task: "accent",
  change: "warning",
  grade: "success",
  comment: "info",
  announcement: "info",
  event: "neutral",
  other: "neutral",
};

function formatDue(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function UpdatesList() {
  const [updates, setUpdates] = useState<UpdateJson[] | null>(null);
  const [filter, setFilter] = useState<UpdateKind | "all" | "unread">("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/updates");
    const body = await res.json().catch(() => ({}));
    setUpdates(res.ok ? (body.updates ?? []) : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(method: "PATCH" | "POST", body: unknown) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/updates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "danger", text: data.error ?? "Could not do that" });
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  if (updates === null) return <p className="text-sm text-muted">Loading…</p>;

  if (updates.length === 0) {
    return (
      <EmptyState
        title="No class updates yet"
        hint="Connect Gmail in Settings and sync — ManageBac announcements, grades and comments will appear here."
      />
    );
  }

  const unread = updates.filter((u) => !u.read).length;
  const kindsPresent = UPDATE_KINDS.filter((k) => updates.some((u) => u.kind === k));
  const shown = updates.filter((u) =>
    filter === "all" ? true : filter === "unread" ? !u.read : u.kind === filter,
  );

  const chip = (value: typeof filter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
        filter === value
          ? "border-accent bg-accent-soft font-medium text-accent"
          : "border-border text-muted hover:border-border-strong hover:text-fg"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {chip("all", `All ${updates.length}`)}
          {chip("unread", `Unread ${unread}`)}
          {kindsPresent.map((k) => chip(k, KIND_META[k].label))}
        </div>
        {unread > 0 && (
          <Button size="sm" onClick={() => send("PATCH", { all: true })} disabled={busy}>
            Mark all read
          </Button>
        )}
      </div>

      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      <Card>
        <CardBody className="py-1">
          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nothing matches that filter.</p>
          ) : (
            <ul className="divide-y divide-border">
              {shown.map((u) => (
                <li key={u.id} className="flex gap-3 py-3">
                  <span
                    aria-label={u.read ? "Read" : "Unread"}
                    className={`mt-2 h-2 w-2 shrink-0 rounded-full ${u.read ? "bg-transparent" : "bg-accent"}`}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={KIND_TONE[u.kind]}>{KIND_META[u.kind].label}</Badge>
                      {u.subject && <span className="text-xs text-muted">{u.subject}</span>}
                      <span className="text-xs text-faint">· {relativeDay(new Date(u.receivedAt))}</span>
                    </div>
                    <p className={`text-sm ${u.read ? "text-muted" : "font-medium text-fg"}`}>{u.title}</p>
                    {u.snippet && <p className="line-clamp-2 text-sm text-muted">{u.snippet}</p>}

                    {u.dueAt && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs text-muted">Mentions {formatDue(u.dueAt)}</span>
                        {u.deadlineId ? (
                          <Link href="/deadlines" className="text-xs font-medium text-success hover:underline">
                            In your deadlines ✓
                          </Link>
                        ) : (
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => send("POST", { id: u.id })}>
                            Add to deadlines
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => send("PATCH", { id: u.id, read: !u.read })}
                  >
                    {u.read ? "Mark unread" : "Mark read"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
