"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, EmptyState, Input } from "@/components/ui";
import type { Note } from "./types";

interface Props {
  group: number;
  notes: Note[];
  onChanged: () => void;
  onError: (message: string) => void;
}

const TEXTAREA =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint transition-colors hover:border-border-strong";

export function NotesPanel({ group, notes, onChanged, onError }: Props) {
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);

  async function save(method: "POST" | "PATCH", payload: Record<string, unknown>) {
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`/api/subjects/${group}/notes`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Could not save that note");
        return false;
      }
      onChanged();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (await save("POST", draft)) {
      setDraft({ title: "", body: "" });
      setComposing(false);
    }
  }

  async function update(id: string) {
    if (await save("PATCH", { id, ...edit })) setEditingId(null);
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/subjects/${group}/notes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  function startEditing(note: Note) {
    setEditingId(note.id);
    setEdit({ title: note.title ?? "", body: note.body });
  }

  return (
    <Card>
      <CardHeader
        title="Notes"
        subtitle="Anything worth keeping for this subject."
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
          <EmptyState title="No notes yet" hint="Jot down anything you want to come back to." />
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
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {note.title && <p className="font-medium text-fg">{note.title}</p>}
                        <p className="whitespace-pre-wrap break-words text-sm text-muted">{note.body}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEditing(note)} disabled={busy}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => remove(note.id)} disabled={busy}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
