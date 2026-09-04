"use client";

import { useState } from "react";
import { SUBJECT_GROUPS } from "@/lib/ib-subjects";
import { Banner, Button, Card, CardBody, Field, Input, Select } from "@/components/ui";

/** Today in the local timezone, formatted for <input type="date">. */
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AddDeadline({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("23:59");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Build from local parts so "23:59" means 23:59 where the user is.
      const [y, m, d] = date.split("-").map(Number);
      const [hh, mm] = time.split(":").map(Number);
      const dueAt = new Date(y, m - 1, d, hh, mm);

      const res = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dueAt: dueAt.toISOString(), subject }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setTitle("");
      setSubject("");
      setOpen(false);
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add deadline
      </Button>
    );
  }

  return (
    <Card className="animate-fade-up w-full">
      <CardBody>
        <form onSubmit={submit} className="space-y-3">
          <Field label="What's due?">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Economics IA first draft"
              maxLength={140}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Subject">
              <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">None</option>
                {SUBJECT_GROUPS.flatMap((g) =>
                  g.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  )),
                )}
              </Select>
            </Field>
          </div>

          {error && <Banner tone="danger">{error}</Banner>}

          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={saving || !title.trim()}>
              {saving ? "Adding…" : "Add"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
