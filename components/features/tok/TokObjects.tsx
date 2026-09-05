"use client";

import { useEffect, useState } from "react";
import { Badge, Card, CardBody, CardHeader, Field } from "@/components/ui";
import { OBJECT_SLOTS } from "@/lib/tok";

interface ObjectRow {
  slot: number;
  name: string | null;
  context: string | null;
  link: string | null;
}

const TEXTAREA =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint transition-colors hover:border-border-strong";

/** The exhibition's three objects — fixed slots, not a list you add to. */
export function TokObjects({
  objects,
  busy,
  onSave,
}: {
  objects: ObjectRow[];
  busy: boolean;
  onSave: (slot: number, patch: { name: string; context: string; link: string }) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Your three objects"
        subtitle="Each needs its own specific real-world context, and a link back to the prompt."
      />
      <CardBody className="space-y-4">
        {OBJECT_SLOTS.map((slot) => (
          <ObjectSlot
            key={slot}
            slot={slot}
            saved={objects.find((o) => o.slot === slot)}
            busy={busy}
            onSave={onSave}
          />
        ))}
      </CardBody>
    </Card>
  );
}

function ObjectSlot({
  slot,
  saved,
  busy,
  onSave,
}: {
  slot: number;
  saved?: ObjectRow;
  busy: boolean;
  onSave: (slot: number, patch: { name: string; context: string; link: string }) => void;
}) {
  const [form, setForm] = useState({ name: "", context: "", link: "" });

  // Re-seed when the saved row changes, so a reload does not leave stale text.
  useEffect(() => {
    setForm({
      name: saved?.name ?? "",
      context: saved?.context ?? "",
      link: saved?.link ?? "",
    });
  }, [saved]);

  const chosen = (saved?.name ?? "").trim().length > 0;

  function commit() {
    const unchanged =
      form.name === (saved?.name ?? "") &&
      form.context === (saved?.context ?? "") &&
      form.link === (saved?.link ?? "");
    if (!unchanged) onSave(slot, form);
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${
            chosen ? "border-accent bg-accent text-accent-fg" : "border-border-strong text-faint"
          }`}
        >
          {slot}
        </span>
        <h3 className="font-medium text-fg">Object {slot}</h3>
        {chosen && <Badge tone="success">Chosen</Badge>}
      </div>

      <Field label="What it is">
        <input
          className={TEXTAREA}
          value={form.name}
          disabled={busy}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          onBlur={commit}
          placeholder="e.g. My grandmother's expired passport"
        />
      </Field>

      <Field label="Real-world context" hint="Where this particular object comes from — not the type of thing in general.">
        <textarea
          rows={2}
          className={TEXTAREA}
          value={form.context}
          disabled={busy}
          onChange={(e) => setForm({ ...form, context: e.target.value })}
          onBlur={commit}
          placeholder="Whose it is, where it's from, why this specific one…"
        />
      </Field>

      <Field label="Link to the prompt" hint="How this object answers the question you chose.">
        <textarea
          rows={2}
          className={TEXTAREA}
          value={form.link}
          disabled={busy}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
          onBlur={commit}
          placeholder="What it shows about knowledge…"
        />
      </Field>
    </div>
  );
}
