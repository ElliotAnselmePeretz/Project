"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const NAV = [
  { href: "/", label: "Deadlines", icon: "◷" },
  { href: "/subjects", label: "Subjects", icon: "◈" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="stagger space-y-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 ${
              active
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:translate-x-0.5 hover:bg-surface-alt hover:text-fg"
            }`}
          >
            {/* Active marker grows in from nothing rather than appearing abruptly. */}
            <span
              className={`absolute left-0 top-1/2 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-all duration-300 ${
                active ? "h-5 opacity-100" : "h-0 opacity-0"
              }`}
            />
            <span className="text-base leading-none transition-transform duration-200 group-hover:scale-110">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-fg">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-sm font-bold text-accent-fg shadow-soft transition-transform duration-300 hover:rotate-6 hover:scale-105">
        S
      </span>
      Studybase
    </Link>
  );
}

export function Sidebar({ email, action }: { email?: string | null; action?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on navigation, otherwise it hangs over the new page.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Mobile bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="rounded-md p-2 text-muted transition-colors hover:bg-surface-alt hover:text-fg"
        >
          <span className="block h-4 w-5">
            <span
              className={`block h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${
                open ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`mt-1.5 block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`mt-1.5 block h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${
                open ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-20 md:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-fg/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="animate-slide-in absolute left-0 top-0 h-full w-64 border-r border-border bg-surface p-4 pt-20 shadow-soft-lg">
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="absolute bottom-4 left-4 right-4 space-y-2 border-t border-border pt-4">
              {email && <p className="truncate text-xs text-faint">{email}</p>}
              {action}
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-60 flex-col border-r border-border bg-surface/60 p-4 backdrop-blur md:flex">
        <div className="animate-fade-in mb-8 px-1 pt-1">
          <Brand />
        </div>

        <NavLinks />

        <div className="mt-auto space-y-2 border-t border-border pt-4">
          {email && <p className="truncate px-3 text-xs text-faint">{email}</p>}
          {action}
        </div>
      </aside>
    </>
  );
}
