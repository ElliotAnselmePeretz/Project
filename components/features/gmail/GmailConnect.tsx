"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Banner, Button, Card, CardBody, SectionTitle, buttonClasses } from "@/components/ui";

/**
 * A plain <a>, not LinkButton: this route redirects off to Google, and Next's
 * client-side Link would try to fetch it as an app page instead of following it.
 */
function ConnectLink({ children }: { children: React.ReactNode }) {
  return (
    <a href="/api/gmail/connect" className={buttonClasses("primary")}>
      {children}
    </a>
  );
}

interface Status {
  configured: boolean;
  connected: boolean;
  email: string | null;
  needsReconnect: boolean;
  lastSyncedAt: string | null;
}

/** Messages for the ?gmail= value the Google callback redirects back with. */
const RETURN_MESSAGES: Record<string, { tone: "success" | "danger" | "warning"; text: string }> = {
  connected: { tone: "success", text: "Gmail connected. Press Sync to read your ManageBac emails." },
  denied: { tone: "warning", text: "Gmail wasn't connected — access was not granted on Google's screen." },
  error: { tone: "danger", text: "Connecting Gmail failed. Try again, and make sure you allow access." },
  "not-configured": {
    tone: "warning",
    text: "Gmail isn't set up for this app yet — GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing from .env.",
  },
};

function when(iso: string | null) {
  if (!iso) return "never";
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function GmailConnect() {
  const params = useSearchParams();
  // Captured once: the address is tidied below, and Next re-reads it when it
  // changes, which would otherwise make the message disappear immediately.
  const [returned] = useState(() => RETURN_MESSAGES[params.get("gmail") ?? ""]);

  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/gmail");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Show the result of coming back from Google once, then tidy the address so
  // a reload does not announce "connected" again.
  useEffect(() => {
    if (returned) window.history.replaceState(null, "", window.location.pathname);
  }, [returned]);

  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: data.needsReconnect ? "warning" : "danger", text: data.error ?? "Sync failed" });
      } else {
        setMessage({
          tone: "success",
          text:
            data.added === 0
              ? `Checked ${data.checked} email${data.checked === 1 ? "" : "s"} — nothing new.`
              : `Added ${data.added} class update${data.added === 1 ? "" : "s"}.`,
        });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setMessage(null);
    try {
      await fetch("/api/gmail", { method: "DELETE" });
      setMessage({ tone: "success", text: "Gmail disconnected. Updates already read are kept." });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <SectionTitle>Gmail</SectionTitle>
        <p className="text-sm text-muted">
          Reads the ManageBac emails forwarded to your Gmail and turns them into class updates —
          announcements, grades, comments and changes. Read-only: the app never sends or deletes anything.
        </p>
      </div>

      {returned && !message && <Banner tone={returned.tone}>{returned.text}</Banner>}
      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      <Card>
        <CardBody>
          {!status ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : !status.configured ? (
            <p className="text-sm text-muted">
              Not set up yet. This needs a Google Cloud project and two values in <code>.env</code> —
              see &ldquo;Gmail&rdquo; in the README.
            </p>
          ) : !status.connected ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">Not connected.</p>
              <ConnectLink>Connect Gmail</ConnectLink>
            </div>
          ) : (
            <div className="space-y-3">
              {status.needsReconnect && (
                <Banner tone="warning">
                  Google has stopped accepting this connection. Connect again to keep syncing.
                </Banner>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{status.email}</p>
                  <p className="text-xs text-muted">Last synced {when(status.lastSyncedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {status.needsReconnect ? (
                    <ConnectLink>Connect again</ConnectLink>
                  ) : (
                    <Button variant="primary" onClick={sync} disabled={busy}>
                      {busy ? "Syncing…" : "Sync"}
                    </Button>
                  )}
                  <Button variant="danger" onClick={disconnect} disabled={busy}>
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
