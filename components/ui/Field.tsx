import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const CONTROL =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint transition-colors hover:border-border-strong disabled:opacity-50";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${CONTROL} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-fg">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {children}
    </label>
  );
}
