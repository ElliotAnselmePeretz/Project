"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "studybase-theme";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "system", label: "System", icon: "◐" },
  { value: "dark", label: "Dark", icon: "☾" },
];

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // "system" means: remove the override and let prefers-color-scheme decide.
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let stored: Theme = "system";
    try {
      stored = (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
    } catch {
      // Private browsing or blocked storage — fall back to system.
    }
    setTheme(stored);
    setMounted(true);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this page load.
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5"
    >
      {OPTIONS.map((opt) => {
        // Before hydration we do not know the stored value; render unselected
        // rather than guessing and flashing the wrong pill.
        const active = mounted && theme === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => choose(opt.value)}
            className={`flex-1 rounded-sm px-2 py-1 text-xs transition-all duration-200 active:scale-95 ${
              active
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-surface-alt hover:text-fg"
            }`}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}
