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

const SIZE = 60;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A countdown ring for one study block.
 *
 * The ring starts full and depletes, so "how much is left" is readable at a
 * glance without doing arithmetic on a clock. It is drawn in `--accent`, which
 * is blue in light mode and orange in dark, so it needs no theme logic here.
 *
 * The start time lives in localStorage rather than React state, so a reload
 * mid-block does not lose the count, and elapsed time is derived from that
 * timestamp rather than accumulated by the interval — an interval throttled in
 * a background tab would otherwise undercount badly.
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
    const id = setInterval(() => setNow(Date.now()), 250);
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

  const totalSeconds = Math.max(1, plannedMinutes * 60);
  const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);
  const remaining = Math.max(0, totalSeconds - elapsedSeconds);
  const done = remaining <= 0;

  // Full ring at the start, empty when the time is up.
  const fraction = remaining / totalSeconds;
  const offset = CIRCUMFERENCE * (1 - fraction);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(Math.floor(remaining % 60)).padStart(2, "0");

  return (
    <div className="flex items-center gap-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={done ? "Block finished" : `${mm} minutes ${ss} seconds remaining`}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={done ? "var(--success)" : "var(--accent)"}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={done ? CIRCUMFERENCE : offset}
            style={{ transition: "stroke-dashoffset 0.3s linear, stroke 0.4s ease" }}
          />
        </svg>

        <span className="absolute inset-0 grid place-items-center">
          {done ? (
            <span className="animate-check text-[10px] font-semibold uppercase tracking-wide text-success">
              Done
            </span>
          ) : (
            <span className="text-[13px] font-semibold tabular-nums text-fg">
              {mm}:{ss}
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {done && <span className="text-xs font-medium text-success">Finished</span>}
        <Button size="sm" variant={done ? "primary" : "secondary"} onClick={stop}>
          {done ? "Log it" : "Stop"}
        </Button>
      </div>
    </div>
  );
}
