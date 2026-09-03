"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, EmptyState, Input } from "@/components/ui";
import type { Goal } from "./types";

interface Props {
  group: number;
  goals: Goal[];
  onChanged: () => void;
  onError: (message: string) => void;
}

export function GoalsPanel({ group, goals, onChanged, onError }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`/api/subjects/${group}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Could not add that goal");
        return;
      }
      setText("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(goal: Goal) {
    setBusy(true);
    try {
      await fetch(`/api/subjects/${group}/goals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goal.id, done: !goal.done }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/subjects/${group}/goals?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const remaining = goals.filter((g) => !g.done).length;

  return (
    <Card>
      <CardHeader
        title="Goals"
        subtitle={goals.length === 0 ? undefined : `${remaining} still to do`}
      />
      <CardBody className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Finish the IA draft before half term"
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
              <li key={goal.id} className="flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-surface-alt">
                <input
                  type="checkbox"
                  checked={goal.done}
                  onChange={() => toggle(goal)}
                  disabled={busy}
                  className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  aria-label={goal.text}
                />
                <span className={`flex-1 text-sm ${goal.done ? "text-faint line-through" : "text-fg"}`}>
                  {goal.text}
                </span>
                <Button variant="ghost" size="sm" onClick={() => remove(goal.id)} disabled={busy}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
