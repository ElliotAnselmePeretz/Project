"use client";

import { useEffect, useState } from "react";

export function ManagebacForm() {
  const [url, setUrl] = useState("");
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.managebacConfigured)))
      .catch(() => {});
  }, []);

  async function save(value: string | null) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managebacUrl: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? "Could not save", ok: false });
        return;
      }
      setConfigured(data.managebacConfigured);
      setUrl("");
      setMessage({ text: value ? "Saved. Go back and hit Sync now." : "Removed.", ok: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-medium">ManageBac calendar feed</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          In ManageBac: My Workspace → View Full Calendar → Subscribe to Calendar, then copy the URL.
          It is stored encrypted, and treated as a password — anyone with it can read your calendar.
        </p>
      </div>

      {configured && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
          <span>A feed is configured.</span>
          <button onClick={() => save(null)} disabled={saving} className="text-red-600 hover:underline">
            Remove
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://….managebac.com/….ics"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
        />
        <button
          onClick={() => save(url)}
          disabled={saving || url.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {configured ? "Replace" : "Save"}
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>
      )}
    </section>
  );
}
