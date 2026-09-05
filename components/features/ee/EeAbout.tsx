"use client";

import { Card, CardBody, EmptyState, LinkButton } from "@/components/ui";
import { EE_INFO, hasEeInfo } from "@/lib/ee-info";

export function EeAbout() {
  const info = EE_INFO;

  const rows = (
    [
      ["Format", info.format],
      ["Length", info.length],
      ["Assessed", info.assessed],
      ["Supervision", info.supervision],
    ] as const
  ).filter(([, value]) => Boolean(value));

  return (
    <div className="stagger space-y-5">
      {!hasEeInfo() ? (
        <EmptyState
          title="Nothing recorded yet"
          hint="What the extended essay requires hasn't been written down here. It gets added from a real brief or syllabus, not guessed."
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

          {info.notes && info.notes.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="mb-2 font-medium text-fg">Worth knowing</h3>
                <ul className="space-y-1.5">
                  {info.notes.map((note) => (
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

          {info.source && (
            <p className="text-xs text-muted">
              Source:{" "}
              <a
                href={info.source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {info.source.label}
              </a>
            </p>
          )}
        </>
      )}

      <div>
        <LinkButton href="/ee">← Back to your extended essay</LinkButton>
      </div>
    </div>
  );
}
