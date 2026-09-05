"use client";

import { useEffect, useState } from "react";

type Tone = "accent" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/**
 * A bar that animates to its value on mount and on every change, rather than
 * snapping. Starts at zero on first paint so the fill is always visible.
 */
export function Progress({
  value,
  max = 100,
  tone = "accent",
  label,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  label?: string;
}) {
  const target = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Next frame, so the transition has a zero to animate away from.
    const id = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-surface-alt"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${TONES[tone]}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
