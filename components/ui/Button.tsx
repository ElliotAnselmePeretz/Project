import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-sm",
  secondary: "bg-surface text-fg border border-border hover:border-border-strong hover:bg-surface-alt",
  ghost: "text-muted hover:text-fg hover:bg-surface-alt",
  danger: "text-danger hover:bg-danger-soft",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-[15px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 " +
  "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

/**
 * The shared look, so anything that should read as a button gets it from one
 * place — `LinkButton` uses this rather than copying the classes.
 */
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra = "") {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({ variant = "secondary", size = "md", className = "", children, ...rest }: Props) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
