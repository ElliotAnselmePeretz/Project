import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

/**
 * Site chrome: ambient glow, sidebar nav, and the content column.
 * Every signed-in page renders inside this.
 */
export function AppShell({
  email,
  action,
  children,
}: {
  email?: string | null;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="glow-field" aria-hidden="true" />
      <Sidebar email={email} action={action} />
      <div className="md:pl-60">{children}</div>
    </div>
  );
}
