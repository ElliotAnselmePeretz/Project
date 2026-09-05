"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts from the previous value to the new one.
 *
 * Honours prefers-reduced-motion by jumping straight to the value — a ticking
 * number is exactly the kind of unrequested movement that setting exists to
 * suppress.
 */
export function CountUp({ value, duration = 600 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const reduced =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }

    const start = performance.now();
    const origin = from.current;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease out: fast at first, settling gently on the final number.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(origin + (value - origin) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className="tabular-nums">{shown}</span>;
}
