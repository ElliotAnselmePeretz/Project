"use client";

import { useState } from "react";
import { URGENCY_LABELS } from "@/lib/daily-study-planner";
import { Badge, Banner, Button, Card, CardBody, CountUp, Input, Progress, SectionTitle } from "@/components/ui";
import type { Block, PlanResponse } from "./types";

const OUTCOMES = [
  { id: "finished", label: "Finished" },
  { id: "progress", label: "Made progress" },
  { id: "stuck", label: "Still stuck" },
] as const;

function BlockRow({
  block,
  onOutcome,
  onMinutes,
}: {
  block: Block;
  onOutcome: (id: string, outcome: Block["outcome"], actualMinutes?: number) => void;
  onMinutes: (id: string, minutes: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(block.minutes);
  const [actual, setActual] = useState<string>("");

  if (block.kind === "break") {
    return (
      <li className="relative flex items-center gap-3 py-2 pl-9 text-xs text-faint">
        <span
          className="absolute left-[9px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-border-strong"
          aria-hidden="true"
        />
        <span className="animate-fade-in">{block.minutes}m break</span>
      </li>
    );
  }

  return (
    <li className="relative pl-9">
      <span
        className={`absolute left-[4px] top-5 z-[1] grid h-4 w-4 place-items-center rounded-full border-2 transition-all duration-500 ${
          block.outcome
            ? "border-success bg-success"
            : block.kind === "unblock"
              ? "border-warning bg-bg"
              : "border-accent bg-bg"
        }`}
        aria-hidden="true"
      >
        {block.outcome && <span className="animate-check text-[9px] leading-none text-bg">✓</span>}
      </span>

      <Card className={`transition-all duration-500 ${block.outcome ? "opacity-70" : ""}`}>
        <CardBody className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {block.subject && <Badge tone="neutral">{block.subject}</Badge>}
                {block.kind === "unblock" && <Badge tone="warning">unblock</Badge>}
                {block.urgency && <Badge tone="accent">{URGENCY_LABELS[block.urgency]}</Badge>}
                {block.edited && <span className="text-[10px] text-faint">edited</span>}
              </div>
              <p className="mt-1.5 font-medium text-fg">{block.title}</p>
            </div>

            <div className="shrink-0 text-right">
              {editing ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    aria-label={`Minutes for ${block.title}`}
                    className="w-20"
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onMinutes(block.id, minutes);
                      setEditing(false);
                    }}
                  >
                    Set
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-sm px-1.5 py-0.5 text-sm font-semibold text-fg transition-colors hover:text-accent"
                  title="Change the length of this block"
                >
                  {block.minutes}m
                </button>
              )}
            </div>
          </div>

          {block.method && (
            <p className="rounded-md bg-surface-alt px-3 py-2 text-sm text-muted">{block.method}</p>
          )}
          {block.reason && <p className="text-xs text-faint">{block.reason}</p>}

          <div className="flex flex-wrap items-center gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.id}
                onClick={() => onOutcome(block.id, o.id, actual ? Number(actual) : undefined)}
                aria-pressed={block.outcome === o.id}
                className={`rounded-md border px-3 py-1.5 text-xs transition-all duration-200 active:scale-[0.97] ${
                  block.outcome === o.id
                    ? "animate-pop border-accent bg-accent-soft font-medium text-accent"
                    : "border-border text-muted hover:border-border-strong hover:text-fg hover:-translate-y-px"
                }`}
              >
                {o.label}
              </button>
            ))}
            <Input
              type="number"
              min={0}
              max={600}
              placeholder="actual min"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              aria-label={`Actual minutes spent on ${block.title}`}
              className="w-28"
            />
            {block.outcome && (
              <button
                onClick={() => onOutcome(block.id, null)}
                className="text-xs text-faint transition-colors hover:text-fg"
              >
                Clear
              </button>
            )}
          </div>

          {block.outcome && (
            <p className="animate-fade-up text-xs text-muted">
              Recorded as <strong>{OUTCOMES.find((o) => o.id === block.outcome)?.label}</strong>
              {block.actualMinutes != null ? ` · ${block.actualMinutes}m` : ""}. This records study time — it
              does not submit or complete the assignment.
            </p>
          )}
        </CardBody>
      </Card>
    </li>
  );
}

export function PlanView({
  plan,
  busy,
  onOutcome,
  onMinutes,
  onReplan,
  onStartOver,
}: {
  plan: PlanResponse;
  busy: boolean;
  onOutcome: (id: string, outcome: Block["outcome"], actualMinutes?: number) => void;
  onMinutes: (id: string, minutes: number) => void;
  onReplan: () => void;
  onStartOver: () => void;
}) {
  const done = plan.blocks.filter((b) => b.kind !== "break" && b.outcome).length;
  const total = plan.blocks.filter((b) => b.kind !== "break").length;

  return (
    <div className="space-y-5">
      <Card className="animate-pop">
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-fg">
                <CountUp value={plan.studyMinutes} />m of study ·{" "}
                <CountUp value={plan.breakMinutes} />m of breaks
                {plan.spareMinutes > 0 ? (
                  <>
                    {" · "}
                    <CountUp value={plan.spareMinutes} />m spare
                  </>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                <CountUp value={done} /> of {total} blocks recorded
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onReplan} disabled={busy}>
                {busy ? "Replanning…" : "Replan"}
              </Button>
              <Button size="sm" variant="ghost" onClick={onStartOver} disabled={busy}>
                Start over
              </Button>
            </div>
          </div>
          <Progress
            value={done}
            max={Math.max(1, total)}
            tone={done === total ? "success" : "accent"}
            label="Blocks recorded"
          />
        </CardBody>
      </Card>

      {plan.urgentShortfallMinutes > 0 && (
        <Banner tone="danger">
          <strong>Urgent work does not fit.</strong> About {plan.urgentShortfallMinutes} minutes of overdue or
          due-today work has no room in today&apos;s session. Give yourself more time, cut something, or accept
          that it moves — but it is not planned.
        </Banner>
      )}

      <section>
        <SectionTitle>Today&apos;s plan</SectionTitle>
        <div className="relative">
          {/* One continuous thread behind every row, drawn downward on mount so
              the plan reads as a sequence rather than a pile of cards. */}
          <span
            className="animate-draw-down absolute bottom-6 left-[11px] top-6 w-0.5 rounded-full bg-border-strong"
            aria-hidden="true"
          />
          <ul className="cascade relative space-y-1">
            {plan.blocks.map((b) => (
              <BlockRow key={b.id} block={b} onOutcome={onOutcome} onMinutes={onMinutes} />
            ))}
          </ul>
        </div>
      </section>

      {plan.unscheduled.length > 0 && (
        <section className="animate-fade-up">
          <SectionTitle>Not scheduled today</SectionTitle>
          <ul className="stagger space-y-2">
            {plan.unscheduled.map((u) => (
              <Card key={u.key}>
                <CardBody className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {u.subject && <Badge tone="neutral">{u.subject}</Badge>}
                      <Badge tone={u.urgency === "overdue" || u.urgency === "today" ? "danger" : "neutral"}>
                        {URGENCY_LABELS[u.urgency]}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-medium text-fg">{u.title}</p>
                    <p className="text-xs text-muted">
                      {u.remainingMinutes}m of work left · {u.reason}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
