"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  /**
   * Shown nested underneath while this item or one of them is the current
   * section. Unlike a group, the parent still navigates — nothing here is a
   * toggle, the extra links just appear once you are in that part of the app.
   */
  reveals?: NavItem[];
}

interface NavGroup {
  label: string;
  icon: string;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const NAV: NavEntry[] = [
  { href: "/", label: "Deadlines", icon: "◷" },
  {
    href: "/subjects",
    label: "Subjects",
    icon: "◈",
    // An IA belongs to a subject, so it lives here rather than in the core.
    reveals: [{ href: "/ia", label: "IA", icon: "▤" }],
  },
  {
    // The actual DP core: TOK, EE and CAS. Grouped so the sidebar stays short.
    label: "DP core",
    icon: "◆",
    children: [
      { href: "/ee", label: "EE", icon: "❐" },
      { href: "/tok", label: "TOK", icon: "◍" },
      { href: "/cas", label: "CAS", icon: "❖" },
    ],
  },
  { href: "/extracurricular", label: "Extracurricular", icon: "◎" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

/**
 * "/" only matches itself; everything else matches its sub-pages too, so
 * /subjects/4/ia keeps Subjects lit rather than nothing at all.
 */
function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  nested,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-md py-2 text-sm transition-all duration-200 ${
        nested ? "pl-3 pr-3" : "px-3"
      } ${
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
}

function NavGroupLinks({
  group,
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const hasActiveChild = group.children.some((child) => isActive(pathname, child.href));

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200 ${
          hasActiveChild && !open
            ? "font-medium text-accent"
            : "text-muted hover:bg-surface-alt hover:text-fg"
        }`}
      >
        <span className="text-base leading-none transition-transform duration-200 group-hover:scale-110">
          {group.icon}
        </span>
        {group.label}
        <span
          aria-hidden="true"
          className={`ml-auto text-[10px] transition-transform duration-300 ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
      </button>

      {/* Rows animate open by growing their grid track — no fixed height to
          keep in sync with the number of children. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
            {group.children.map((child) => (
              <NavLink
                key={child.href}
                item={child}
                active={isActive(pathname, child.href)}
                nested
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A normal link that grows extra links beneath it while you are in its part of
 * the app. The revealed links stay while one of them is current, so clicking
 * IA does not make IA disappear.
 */
function NavItemWithReveals({
  item,
  pathname,
  show,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  show: boolean;
  onNavigate?: () => void;
}) {
  const parentActive = isActive(pathname, item.href);
  const revealed = item.reveals ?? [];

  return (
    <div>
      <NavLink item={item} active={parentActive} onNavigate={onNavigate} />

      <div
        className={`grid transition-[grid-template-rows] duration-300 ${
          show ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
            {revealed.map((child) => (
              <NavLink
                key={child.href}
                item={child}
                active={isActive(pathname, child.href)}
                nested
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Which section the current page belongs to, by label — the section the menu
 * opens by itself so the page you are on is never hidden inside a shut menu.
 */
function sectionForPath(pathname: string): string | null {
  for (const entry of NAV) {
    if (isGroup(entry)) {
      if (entry.children.some((c) => isActive(pathname, c.href))) return entry.label;
    } else if (entry.reveals?.length) {
      const here =
        isActive(pathname, entry.href) || entry.reveals.some((c) => isActive(pathname, c.href));
      if (here) return entry.label;
    }
  }
  return null;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  // Exactly one section is open at a time, so opening DP core puts away the
  // links under Subjects rather than stacking two open sections.
  const [expanded, setExpanded] = useState(() => sectionForPath(pathname));

  // Follow the page again after navigating.
  useEffect(() => setExpanded(sectionForPath(pathname)), [pathname]);

  return (
    <nav className="space-y-1">
      {NAV.map((entry) => {
        if (isGroup(entry)) {
          const open = expanded === entry.label;
          return (
            <NavGroupLinks
              key={entry.label}
              group={entry}
              pathname={pathname}
              open={open}
              onToggle={() => setExpanded(open ? null : entry.label)}
              onNavigate={onNavigate}
            />
          );
        }

        if (entry.reveals?.length) {
          return (
            <NavItemWithReveals
              key={entry.href}
              item={entry}
              pathname={pathname}
              show={expanded === entry.label}
              onNavigate={onNavigate}
            />
          );
        }

        return (
          <NavLink
            key={entry.href}
            item={entry}
            active={isActive(pathname, entry.href)}
            onNavigate={onNavigate}
          />
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
            <div className="absolute bottom-4 left-4 right-4 space-y-3 border-t border-border pt-4">
              <ThemeToggle />
              {email && <p className="truncate text-xs text-faint">{email}</p>}
              {action}
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-60 flex-col border-r border-border bg-surface/60 p-4 backdrop-blur md:flex">
        {/* No entrance animation here: the sidebar remounts on every
            navigation, so anything that animates in replays on each page. */}
        <div className="mb-8 px-1 pt-1">
          <Brand />
        </div>

        <NavLinks />

        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <ThemeToggle />
          {email && <p className="truncate px-3 text-xs text-faint">{email}</p>}
          {action}
        </div>
      </aside>
    </>
  );
}
