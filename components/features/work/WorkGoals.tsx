"use client";

import { useCallback, useEffect, useState } from "react";
import { Banner, Button, Card, CardBody, CardHeader, EmptyState, Input } from "@/components/ui";
import type { WorkScope } from "@/lib/work";

interface Goal {
  id: string;
  text: string;
  done: boolean;
}

/** Goals for any non-subject area — the extended essay, TOK, CAS. */
export function WorkGoals({ scope, hint }: { scope: WorkScope; hint?: string }) {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/work/${scope}/goals`);
    const body = await res.json().catch(() => ({}));
    setGoals(res.ok ? (body.goals ?? []) : []);
    if (!res.ok) setError(body.error ?? "Could not load goals");
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(method: string, body?: unknown, query = "") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/work/${scope}/goals${query}`, {
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
    if (!text.trim()) return;
    if (await send("POST", { text })) setText("");
  }

  if (goals === null) return <p className="text-sm text-muted">Loading…</p>;

  const remaining = goals.filter((g) => !g.done).length;

  return (
    <div className="space-y-4">
      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader title="Goals" subtitle={goals.length === 0 ? hint : `${remaining} still to do`} />
        <CardBody className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Draft the methodology section"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
            />
            <Button variant="primary" onClick={add} disabled={busy || !text.trim()}>
              Add
            </Button>
          </div>

          {goals.length === 0 ? (
            <EmptyState title="No goals yet" hint="Set one and tick it off when it's done." />
          ) : (
            <ul className="space-y-1">
              {goals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-surface-alt"
                >
                  <input
                    type="checkbox"
                    checked={goal.done}
                    onChange={() => send("PATCH", { id: goal.id, done: !goal.done })}
                    disabled={busy}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                    aria-label={goal.text}
                  />
                  <span className={`flex-1 text-sm ${goal.done ? "text-faint line-through" : "text-fg"}`}>
                    {goal.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => send("DELETE", undefined, `?id=${encodeURIComponent(goal.id)}`)}
                  >
                    Remove
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
