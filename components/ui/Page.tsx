import Link from "next/link";
import type { ReactNode } from "react";

/** Standard page wrapper — keeps width, padding and rhythm identical everywhere. */
export function Page({ children, width = "md" }: { children: ReactNode; width?: "md" | "lg" }) {
  return (
    <main className={`mx-auto w-full ${width === "lg" ? "max-w-4xl" : "max-w-2xl"} px-5 py-8 sm:px-6 sm:py-10`}>
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: { href: string; label?: string };
  action?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="text-sm text-muted transition-colors hover:text-fg">
          ← {back.label ?? "Back"}
        </Link>
      )}
      <div className={`flex items-start justify-between gap-4 ${back ? "mt-3" : ""}`}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface-alt/50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold tracking-tight text-fg">{children}</h2>
      {action}
    </div>
  );
}
