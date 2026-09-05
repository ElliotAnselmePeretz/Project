"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, EmptyState, Input } from "@/components/ui";
import type { FeedbackEntry } from "./types";

interface Props {
  group: number;
  feedback: FeedbackEntry[];
  onChanged: () => void;
  onError: (message: string) => void;
}

const TEXTAREA =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint transition-colors hover:border-border-strong";

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function IaFeedbackLog({ group, feedback, onChanged, onError }: Props) {
  const [draft, setDraft] = useState({ note: "", givenAt: "" });
  const [composing, setComposing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(method: string, body?: unknown, query = "") {
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`/api/subjects/${group}/ia/feedback${query}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.error ?? "Could not save that");
        return false;
      }
      onChanged();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (await send("POST", draft)) {
      setDraft({ note: "", givenAt: "" });
      setComposing(false);
    }
  }

  async function saveReply(id: string) {
    if (await send("PATCH", { id, response: reply })) {
      setReplyingTo(null);
      setReply("");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Supervisor feedback"
        subtitle="What your teacher said, and what you changed because of it."
        action={
          <Button size="sm" onClick={() => setComposing((v) => !v)} disabled={busy}>
            {composing ? "Cancel" : "Log feedback"}
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {composing && (
          <div className="space-y-3 rounded-md border border-border bg-surface-alt p-3">
            <textarea
              rows={3}
              className={TEXTAREA}
              placeholder="What did they say?"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-muted" htmlFor="feedback-date">
                When
              </label>
              <Input
                id="feedback-date"
                type="date"
                value={draft.givenAt}
                onChange={(e) => setDraft({ ...draft, givenAt: e.target.value })}
                className="w-auto"
              />
              <Button variant="primary" size="sm" onClick={add} disabled={busy || !draft.note.trim()}>
                Save
              </Button>
            </div>
          </div>
        )}

        {feedback.length === 0 ? (
          <EmptyState
            title="No feedback logged"
            hint="Most subjects give one formal round on a draft — worth writing down while it's fresh."
          />
        ) : (
          <ul className="space-y-3">
            {feedback.map((entry) => {
              const when = formatDate(entry.givenAt);
              return (
                <li key={entry.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {when && <p className="text-xs text-faint">{when}</p>}
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-fg">{entry.note}</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => send("DELETE", undefined, `?id=${encodeURIComponent(entry.id)}`)}
                    >
                      Delete
                    </Button>
                  </div>

                  {entry.response && replyingTo !== entry.id && (
                    <p className="mt-2 border-l-2 border-accent pl-3 text-sm text-muted">
                      <span className="font-medium text-fg">What I changed: </span>
                      {entry.response}
                    </p>
                  )}

                  {replyingTo === entry.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        rows={2}
                        className={TEXTAREA}
                        placeholder="What did you change?"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => saveReply(entry.id)}
                          disabled={busy}
                        >
                          Save
                        </Button>
                        <Button size="sm" onClick={() => setReplyingTo(null)} disabled={busy}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1"
                      disabled={busy}
                      onClick={() => {
                        setReplyingTo(entry.id);
                        setReply(entry.response ?? "");
                      }}
                    >
                      {entry.response ? "Edit what you changed" : "Add what you changed"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
