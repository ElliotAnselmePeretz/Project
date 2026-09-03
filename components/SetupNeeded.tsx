const MISSING = [
  ["AUTH_MICROSOFT_ENTRA_ID_ID", process.env.AUTH_MICROSOFT_ENTRA_ID_ID],
  ["AUTH_MICROSOFT_ENTRA_ID_SECRET", process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET],
] as const;

export function SetupNeeded() {
  const missing = MISSING.filter(([, v]) => !v).map(([k]) => k);

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-xl font-semibold">Setup needed</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Sign-in is not configured yet, so Microsoft will reject the login with{" "}
        <code className="rounded bg-[var(--card)] px-1 py-0.5 text-xs">AADSTS900144</code>.
        Add these to <code className="rounded bg-[var(--card)] px-1 py-0.5 text-xs">.env</code> and
        restart the dev server:
      </p>

      <ul className="mt-4 space-y-1">
        {missing.map((k) => (
          <li key={k} className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-xs">
            {k}
          </li>
        ))}
      </ul>

      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
        <li>
          Register an app at{" "}
          <a
            className="underline"
            href="https://portal.azure.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            portal.azure.com
          </a>{" "}
          → App registrations → New registration
        </li>
        <li>
          Add a <em>Web</em> redirect URI:{" "}
          <code className="break-all rounded bg-[var(--card)] px-1 py-0.5 text-xs">
            http://localhost:3000/api/auth/callback/microsoft-entra-id
          </code>
        </li>
        <li>Copy the Application (client) ID, and create a client secret — copy its <em>Value</em></li>
        <li>
          Set <code className="rounded bg-[var(--card)] px-1 py-0.5 text-xs">AUTH_MICROSOFT_ENTRA_ID_TENANT_ID</code>{" "}
          to your school&apos;s Directory (tenant) ID if the app is single-tenant
        </li>
        <li>Add delegated Graph permissions: Mail.Read, Calendars.Read, offline_access</li>
      </ol>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Full walkthrough in the project README.
      </p>
    </main>
  );
}
