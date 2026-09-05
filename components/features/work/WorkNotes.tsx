"use client";

import { useCallback, useEffect, useState } from "react";
import { Banner, Button, Card, CardBody, CardHeader, EmptyState, Input } from "@/components/ui";
import type { WorkScope } from "@/lib/work";

interface Note {
  id: string;
  title: string | null;
  body: string;
}

const TEXTAREA =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint transition-colors hover:border-border-strong";

/** Notes for any non-subject area — the extended essay, TOK, CAS. */
export function WorkNotes({ scope, hint }: { scope: WorkScope; hint?: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/work/${scope}/notes`);
    const body = await res.json().catch(() => ({}));
    setNotes(res.ok ? (body.notes ?? []) : []);
    if (!res.ok) setError(body.error ?? "Could not load notes");
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(method: string, body?: unknown, query = "") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/work/${scope}/notes${query}`, {
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
    if (await send("POST", draft)) {
      setDraft({ title: "", body: "" });
      setComposing(false);
    }
  }

  async function update(id: string) {
    if (await send("PATCH", { id, ...edit })) setEditingId(null);
  }

  if (notes === null) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader
          title="Notes"
          subtitle={hint}
          action={
            <Button size="sm" onClick={() => setComposing((v) => !v)} disabled={busy}>
              {composing ? "Cancel" : "New note"}
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {composing && (
            <div className="space-y-3 rounded-md border border-border bg-surface-alt p-3">
              <Input
                placeholder="Title (optional)"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
              <textarea
                rows={4}
                className={TEXTAREA}
                placeholder="Write your note…"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
              <Button variant="primary" size="sm" onClick={add} disabled={busy || !draft.body.trim()}>
                {busy ? "Saving…" : "Save note"}
              </Button>
            </div>
          )}

          {notes.length === 0 ? (
            <EmptyState title="No notes yet" hint="Anything worth coming back to." />
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li key={note.id} className="rounded-md border border-border p-3">
                  {editingId === note.id ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="Title (optional)"
                        value={edit.title}
                        onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                      />
                      <textarea
                        rows={4}
                        className={TEXTAREA}
                        value={edit.body}
                        onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => update(note.id)}
                          disabled={busy || !edit.body.trim()}
                        >
                          Save
                        </Button>
                        <Button size="sm" onClick={() => setEditingId(null)} disabled={busy}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {note.title && <p className="font-medium text-fg">{note.title}</p>}
                        <p className="whitespace-pre-wrap break-words text-sm text-muted">{note.body}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(note.id);
                            setEdit({ title: note.title ?? "", body: note.body });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={busy}
                          onClick={() => send("DELETE", undefined, `?id=${encodeURIComponent(note.id)}`)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
