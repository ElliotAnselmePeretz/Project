import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses, type ButtonVariant, type ButtonSize } from "./Button";

/**
 * A link that looks like a button.
 *
 * Use this instead of putting a `Button` inside a `Link` — nesting a button
 * inside an anchor is invalid HTML and confuses screen readers. This stays a
 * real link, so middle-click and "open in new tab" keep working.
 */
export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
