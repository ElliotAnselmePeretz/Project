"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";

const KEY = "studybase-block-timer";

interface Running {
  blockId: string;
  startedAt: number;
}

function read(): Running | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Running) : null;
  } catch {
    return null; // private browsing, or storage blocked
  }
}

function write(value: Running | null) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    /* non-fatal: the timer still works for this page load */
  }
}

/**
 * A timer for one study block.
 *
 * The start time is kept in localStorage rather than in React state, so a
 * reload or an accidental navigation mid-block does not lose the count. Elapsed
 * time is derived from the timestamp, not accumulated by the interval — an
 * interval that stops firing in a background tab would otherwise undercount.
 */
export function BlockTimer({
  blockId,
  plannedMinutes,
  onStop,
}: {
  blockId: string;
  plannedMinutes: number;
  onStop: (elapsedMinutes: number) => void;
}) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const running = read();
    if (running?.blockId === blockId) setStartedAt(running.startedAt);
  }, [blockId]);

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const start = useCallback(() => {
    const at = Date.now();
    setStartedAt(at);
    setNow(at);
    write({ blockId, startedAt: at });
  }, [blockId]);

  const stop = useCallback(() => {
    if (startedAt === null) return;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60_000));
    setStartedAt(null);
    write(null);
    onStop(minutes);
  }, [startedAt, onStop]);

  if (startedAt === null) {
    return (
      <Button size="sm" onClick={start}>
        Start
      </Button>
    );
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");
  const over = elapsedSeconds > plannedMinutes * 60;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`tabular-nums text-sm font-semibold ${over ? "text-warning" : "text-accent"}`}
        aria-live="off"
      >
        {mm}:{ss}
      </span>
      {/* A quiet pulse so a running timer is obvious without being loud. */}
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <Button size="sm" variant="primary" onClick={stop}>
        Stop
      </Button>
    </div>
  );
}
