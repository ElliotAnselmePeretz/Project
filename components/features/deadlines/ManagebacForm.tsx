"use client";

import { useEffect, useState } from "react";
import { Banner, Button, Card, CardBody, Field, Input, SectionTitle } from "@/components/ui";

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
      setMessage({ text: value ? "Saved. Go back and press Sync now." : "Removed.", ok: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <SectionTitle>ManageBac calendar feed</SectionTitle>

      <Card>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted">
            In ManageBac: My Workspace → View Full Calendar → Subscribe to Calendar, then copy the
            URL. It is stored encrypted and treated as a password — anyone holding it can read your
            calendar.
          </p>

          {configured && (
            <div className="flex items-center justify-between rounded-md bg-success-soft px-3 py-2 text-sm text-success">
              <span>A feed is configured.</span>
              <Button variant="danger" size="sm" onClick={() => save(null)} disabled={saving}>
                Remove
              </Button>
            </div>
          )}

          <Field label={configured ? "Replace feed URL" : "Feed URL"}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://….managebac.com/….ics"
              />
              <Button
                variant="primary"
                onClick={() => save(url)}
                disabled={saving || url.length === 0}
                className="sm:w-auto"
              >
                {saving ? "Saving…" : configured ? "Replace" : "Save"}
              </Button>
            </div>
          </Field>

          {message && <Banner tone={message.ok ? "success" : "danger"}>{message.text}</Banner>}
        </CardBody>
      </Card>
    </section>
  );
}
