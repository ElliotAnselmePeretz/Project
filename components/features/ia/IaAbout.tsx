"use client";

import { useEffect, useState } from "react";
import { Badge, Banner, Card, CardBody, EmptyState, LinkButton } from "@/components/ui";
import { iaInfoFor } from "@/lib/ia-info";
import type { IaData } from "./types";

export function IaAbout({ group }: { group: number }) {
  const [data, setData] = useState<IaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/subjects/${group}/ia`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) setError(body.error ?? "Could not load this subject");
        else setData(body);
      })
      .catch(() => setError("Could not load this subject"))
      .finally(() => setLoading(false));
  }, [group]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <Banner tone="danger">{error}</Banner>;
  if (!data) return null;

  const info = iaInfoFor(data.subject.name);
  const rows = info
    ? ([
        ["Format", info.format],
        ["Length", info.length],
        ["Assessed", info.assessed],
      ] as const).filter(([, value]) => Boolean(value))
    : [];

  return (
    <div className="stagger space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-fg">{data.subject.name}</h2>
        <Badge tone={data.subject.level === "HL" ? "accent" : "neutral"}>{data.subject.level}</Badge>
        <Badge tone="info">{data.label}</Badge>
      </div>

      {!info ? (
        <EmptyState
          title={`Nothing recorded for ${data.subject.name} yet`}
          hint="What this assessment involves hasn't been written down for this subject. It gets added from a real brief or syllabus, not guessed."
        />
      ) : (
        <>
          {rows.length > 0 && (
            <Card>
              <CardBody>
                <dl className="divide-y divide-border">
                  {rows.map(([label, value]) => (
                    <div key={label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[7rem_1fr]">
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
        <LinkButton href={`/subjects/${group}/ia`}>← Back to your {data.label}</LinkButton>
      </div>
    </div>
  );
}
