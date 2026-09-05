"use client";

import { Card, CardBody, EmptyState, LinkButton } from "@/components/ui";
import { CAS_INFO, hasCasInfo } from "@/lib/cas-info";
import { CAS_STRANDS, STRAND_META } from "@/lib/cas";

export function CasAbout() {
  const rows = (
    [
      ["Overview", CAS_INFO.overview],
      ["Balance", CAS_INFO.balance],
      ["The project", CAS_INFO.project],
      ["Completion", CAS_INFO.completion],
    ] as const
  ).filter(([, value]) => Boolean(value));

  return (
    <div className="stagger space-y-5">
      {/* The three strands are CAS's own definition, not a requirement that
          varies by school, so they are safe to show before any brief arrives. */}
      <Card>
        <CardBody>
          <h3 className="mb-2 font-medium text-fg">The three strands</h3>
          <dl className="divide-y divide-border">
            {CAS_STRANDS.map((strand) => (
              <div key={strand} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[7rem_1fr]">
                <dt className="text-sm font-medium text-fg">{STRAND_META[strand].label}</dt>
                <dd className="text-sm text-muted">{STRAND_META[strand].hint}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      {!hasCasInfo() ? (
        <EmptyState
          title="Nothing else recorded yet"
          hint="What your school asks of you — the balance it expects, the project, and how CAS gets signed off — hasn't been written down here. It gets added from a real brief, not guessed."
        />
      ) : (
        <>
          {rows.length > 0 && (
            <Card>
              <CardBody>
                <dl className="divide-y divide-border">
                  {rows.map(([label, value]) => (
                    <div
                      key={label}
                      className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr]"
                    >
                      <dt className="text-sm font-medium text-muted">{label}</dt>
                      <dd className="text-sm text-fg">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          )}

          {CAS_INFO.notes && CAS_INFO.notes.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="mb-2 font-medium text-fg">Worth knowing</h3>
                <ul className="space-y-1.5">
                  {CAS_INFO.notes.map((note) => (
                    <li key={note} className="flex gap-2 text-sm text-muted">
                      <span aria-hidden="true" className="text-accent">
                        •
                      </span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {CAS_INFO.source && (
            <p className="text-xs text-muted">
              Source:{" "}
              <a
                href={CAS_INFO.source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {CAS_INFO.source.label}
              </a>
            </p>
          )}
        </>
      )}

      <div>
        <LinkButton href="/cas">← Back to CAS</LinkButton>
      </div>
    </div>
  );
}
