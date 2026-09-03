import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The site chrome: header, nav and footer. Every signed-in page renders inside
 * this, so adding a nav link here adds it everywhere.
 */
const NAV = [
  { href: "/", label: "Deadlines" },
  { href: "/subjects", label: "Subjects" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ email, action, children }: { email?: string | null; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-fg">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm font-bold text-accent-fg">S</span>
            Studybase
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-alt hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {email && <span className="hidden text-sm text-faint sm:inline">{email}</span>}
            {action}
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
