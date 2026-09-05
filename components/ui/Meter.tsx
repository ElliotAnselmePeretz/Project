type Tone = "accent" | "success" | "warning" | "danger";

const FILLS: Record<Tone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/**
 * A horizontal progress bar.
 *
 * `value` is a fraction, and values above 1 are expected — going over a word
 * limit is exactly what a student needs to see. The bar itself clamps so it
 * cannot overflow its track, but pass `tone="danger"` to make an overrun read
 * as a problem rather than as success.
 */
export function Meter({
  value,
  tone = "accent",
  className = "",
  label,
}: {
  value: number;
  tone?: Tone;
  className?: string;
  label?: string;
}) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const width = Math.min(safe, 1) * 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(safe * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`h-1.5 w-full overflow-hidden rounded-sm bg-surface-alt ${className}`}
    >
      <div
        className={`h-full rounded-sm transition-[width] duration-300 ${FILLS[tone]}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
