"use client";

import { Badge, Card, CardBody, EmptyState, LinkButton } from "@/components/ui";
import { TOK_COMPONENTS, COMPONENT_META } from "@/lib/tok";
import { TOK_INFO, hasTokInfo, type TokComponentInfo } from "@/lib/tok-info";

function InfoRows({ info }: { info: TokComponentInfo }) {
  const rows = (
    [
      ["Format", info.format],
      ["Length", info.length],
      ["Assessed", info.assessed],
    ] as const
  ).filter(([, value]) => Boolean(value));

  if (rows.length === 0 && !info.notes?.length) {
    return <p className="text-sm text-muted">Nothing recorded for this one yet.</p>;
  }

  return (
    <>
      {rows.length > 0 && (
        <dl className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[7rem_1fr]">
              <dt className="text-sm font-medium text-muted">{label}</dt>
              <dd className="text-sm text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {info.notes && info.notes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {info.notes.map((note) => (
            <li key={note} className="flex gap-2 text-sm text-muted">
              <span aria-hidden="true" className="text-accent">
                •
              </span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function TokAbout() {
  return (
    <div className="stagger space-y-5">
      {!hasTokInfo() ? (
        <EmptyState
          title="Nothing recorded yet"
          hint="What TOK requires hasn't been written down here. It gets added from a real brief or syllabus, not guessed."
        />
      ) : (
        <>
          {TOK_COMPONENTS.map((key) => {
            const info = TOK_INFO[key];
            if (!info) return null;
            const meta = COMPONENT_META[key];
            return (
              <Card key={key}>
                <CardBody>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-fg">{meta.label}</h3>
                    <Badge tone={key === "exhibition" ? "accent" : "info"}>{meta.marking}</Badge>
                  </div>
                  <InfoRows info={info} />
                </CardBody>
              </Card>
            );
          })}

          {TOK_INFO.overall && TOK_INFO.overall.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="mb-2 font-medium text-fg">Worth knowing</h3>
                <ul className="space-y-1.5">
                  {TOK_INFO.overall.map((note) => (
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

          {TOK_INFO.source && (
            <p className="text-xs text-muted">
              Source:{" "}
              <a
                href={TOK_INFO.source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {TOK_INFO.source.label}
              </a>
            </p>
          )}
        </>
      )}

      <div>
        <LinkButton href="/tok">← Back to TOK</LinkButton>
      </div>
    </div>
  );
}
