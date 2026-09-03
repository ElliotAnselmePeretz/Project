import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "danger" | "accent";

const TONES: Record<Tone, string> = {
  info: "border-info/30 bg-info-soft text-info",
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  accent: "border-accent/30 bg-accent-soft text-accent",
};

export function Banner({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-md border p-3 text-sm ${TONES[tone]}`}>{children}</div>;
}
