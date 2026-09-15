"use client";

import { Card, CardBody, CardHeader } from "@/components/ui";
import { stagesFor, stageIndex } from "@/lib/ia";

interface Props {
  group: number;
  stage: string | null;
  busy: boolean;
  onPick: (stage: string | null) => void;
}

export function IaStages({ group, stage, busy, onPick }: Props) {
  const stages = stagesFor(group);
  const current = stageIndex(stage);

  return (
    <Card>
      <CardHeader title="Progress" subtitle="Click whichever stage you have reached." />
      <CardBody>
        <ol className="space-y-1">
          {stages.map((s, i) => {
            const done = current > i;
            const here = current === i;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  // Clicking the stage you are already on clears it, so a
                  // mis-click is undoable without a separate reset control.
                  onClick={() => onPick(here ? null : s.key)}
                  disabled={busy}
                  aria-current={here ? "step" : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                    here
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted hover:bg-surface-alt hover:text-fg"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                      done
                        ? "border-accent bg-accent text-accent-fg"
                        : here
                          ? "border-accent text-accent"
                          : "border-border-strong text-faint"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={done ? "text-fg" : undefined}>{s.label}</span>
                  {here && <span className="ml-auto text-xs">you are here</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
