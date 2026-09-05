"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody } from "@/components/ui";
import { TOK_COMPONENTS, COMPONENT_META, objectsChosen, tokStageIndex, stagesForComponent } from "@/lib/tok";

interface ComponentRow {
  component: string;
  title: string | null;
  stage: string | null;
  wordCount: number | null;
  wordLimit: number | null;
  predictedGrade: string | null;
}

interface ObjectRow {
  slot: number;
  name: string | null;
}

export function TokOverview() {
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [objects, setObjects] = useState<ObjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tok")
      .then((r) => r.json())
      .then((d) => {
        setComponents(d.components ?? []);
        setObjects(d.objects ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  const chosen = objectsChosen(objects);

  return (
    <div className="stagger space-y-3">
      {TOK_COMPONENTS.map((key) => {
        const meta = COMPONENT_META[key];
        const row = components.find((c) => c.component === key);
        const stages = stagesForComponent(key);
        const index = tokStageIndex(row?.stage ?? null);
        const stageLabel = index >= 0 ? stages[index].label : "Not started";

        return (
          <Link key={key} href={`/tok/${key}`} className="block">
            <Card className="transition-colors hover:border-border-strong">
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-fg">{meta.label}</h3>
                  <Badge tone={key === "exhibition" ? "accent" : "info"}>{meta.marking}</Badge>
                  {row?.predictedGrade && <Badge tone="success">Predicted {row.predictedGrade}</Badge>}
                </div>

                <p className="text-sm text-muted">{meta.blurb}</p>

                <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <div className="flex items-center gap-1.5">
                    <dt className="text-muted">Stage</dt>
                    <dd className="font-medium text-fg">{stageLabel}</dd>
                  </div>
                  {key === "exhibition" && (
                    <div className="flex items-center gap-1.5">
                      <dt className="text-muted">Objects</dt>
                      <dd className="font-medium tabular-nums text-fg">{chosen}/3</dd>
                    </div>
                  )}
                  {row?.wordCount != null && row?.wordLimit != null && row.wordLimit > 0 && (
                    <div className="flex items-center gap-1.5">
                      <dt className="text-muted">Words</dt>
                      <dd className="font-medium tabular-nums text-fg">
                        {row.wordCount}/{row.wordLimit}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardBody>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
