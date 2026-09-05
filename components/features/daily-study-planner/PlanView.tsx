"use client";

import { useState } from "react";
import { URGENCY_LABELS, withClockTimes } from "@/lib/daily-study-planner";
import { BlockTimer } from "./BlockTimer";
import { Badge, Banner, Button, Card, CardBody, CountUp, Input, Progress, SectionTitle } from "@/components/ui";
import type { Block, PlanResponse } from "./types";

const OUTCOMES = [
  { id: "finished", label: "Finished" },
  { id: "progress", label: "Made progress" },
  { id: "stuck", label: "Still stuck" },
] as const;

function clockLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const PERFORMANCE = [
  { id: "independent", label: "On my own" },
  { id: "with-help", label: "With help" },
  { id: "not-yet", label: "Not yet" },
] as const;

function BlockRow({
  block,
  times,
  first,
  last,
  onOutcome,
  onMinutes,
  onMethod,
  onPerformance,
  onMove,
}: {
  block: Block;
  times?: { startsAt: Date; endsAt: Date };
  first: boolean;
  last: boolean;
  onOutcome: (id: string, outcome: Block["outcome"], actualMinutes?: number) => void;
  onMinutes: (id: string, minutes: number) => void;
  onMethod: (id: string, method: string) => void;
  onPerformance: (id: string, performance: Block["performance"]) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(block.minutes);
  const [actual, setActual] = useState<string>("");
  const [editingMethod, setEditingMethod] = useState(false);
  const [methodDraft, setMethodDraft] = useState(block.method ?? "");

  if (block.kind === "break") {
    return (
      <li className="relative flex items-center gap-3 py-2 pl-9 text-xs text-faint">
        <span
          className="absolute left-[9px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-border-strong"
          aria-hidden="true"
        />
        <span className="animate-fade-in">
          {times ? `${clockLabel(times.startsAt)} · ` : ""}
          {block.minutes}m break
        </span>
      </li>
    );
  }

  return (
    <li className="relative pl-9">
      {/* The marker reflects what actually happened. A green tick on a block
          recorded as "still stuck" would read as success, which it is not. */}
      <span
        className={`absolute left-[4px] top-5 z-[1] grid h-4 w-4 place-items-center rounded-full border-2 transition-all duration-500 ${
          block.outcome === "finished"
            ? "border-success bg-success"
            : block.outcome === "progress"
              ? "border-accent bg-accent"
              : block.outcome === "stuck"
                ? "border-warning bg-warning"
                : block.kind === "unblock"
                  ? "border-warning bg-bg"
                  : "border-accent bg-bg"
        }`}
        aria-hidden="true"
      >
        {block.outcome === "finished" && (
          <span className="animate-check text-[9px] leading-none text-bg">✓</span>
        )}
        {block.outcome === "progress" && (
          <span className="animate-check h-1.5 w-1.5 rounded-full bg-bg" />
        )}
        {block.outcome === "stuck" && (
          <span className="animate-check text-[9px] font-bold leading-none text-bg">?</span>
        )}
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
              {times && (
                <p className="mt-0.5 text-xs tabular-nums text-muted">
                  {clockLabel(times.startsAt)} – {clockLabel(times.endsAt)}
                </p>
              )}
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
                <div className="flex items-center gap-1">
                  <div className="flex flex-col">
                    <button
                      onClick={() => onMove(block.id, "up")}
                      disabled={first}
                      aria-label={`Move ${block.title} earlier`}
                      className="rounded-sm px-1 text-[10px] leading-none text-faint transition-colors hover:text-accent disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => onMove(block.id, "down")}
                      disabled={last}
                      aria-label={`Move ${block.title} later`}
                      className="rounded-sm px-1 text-[10px] leading-none text-faint transition-colors hover:text-accent disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-sm px-1.5 py-0.5 text-sm font-semibold text-fg transition-colors hover:text-accent"
                    title="Change the length of this block"
                  >
                    {block.minutes}m
                  </button>
                </div>
              )}
            </div>
          </div>

          {editingMethod ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={methodDraft}
                onChange={(e) => setMethodDraft(e.target.value)}
                rows={3}
                maxLength={400}
                aria-label={`Method for ${block.title}`}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onMethod(block.id, methodDraft);
                    setEditingMethod(false);
                  }}
                >
                  Save method
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingMethod(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            block.method && (
              <button
                onClick={() => {
                  setMethodDraft(block.method ?? "");
                  setEditingMethod(true);
                }}
                title="Edit this method"
                className="w-full rounded-md bg-surface-alt px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-alt/70 hover:text-fg"
              >
                {block.method}
              </button>
            )
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
            <BlockTimer
              blockId={block.id}
              plannedMinutes={block.minutes}
              onStop={(elapsed) => setActual(String(elapsed))}
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

          {block.outcome && (block.purpose === "learn" || block.purpose === "practise") && (
            <div className="animate-fade-up space-y-1.5 border-t border-border pt-3">
              <p className="text-xs font-medium text-fg">Could you do it without help?</p>
              <div className="flex flex-wrap gap-1.5">
                {PERFORMANCE.map((o) => (
                  <button
                    key={o.id}
                    onClick={() =>
                      onPerformance(block.id, block.performance === o.id ? null : o.id)
                    }
                    aria-pressed={block.performance === o.id}
                    className={`rounded-md border px-3 py-1.5 text-xs transition-all duration-200 active:scale-[0.97] ${
                      block.performance === o.id
                        ? "animate-pop border-accent bg-accent-soft font-medium text-accent"
                        : "border-border text-muted hover:-translate-y-px hover:border-border-strong hover:text-fg"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-faint">
                Based on an actual attempt, not how confident it felt. This adjusts the difficulty
                suggested next time.
              </p>
            </div>
          )}

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
  startTime,
  busy,
  onOutcome,
  onMinutes,
  onMethod,
  onPerformance,
  onMove,
  onReplan,
  onStartOver,
}: {
  plan: PlanResponse;
  /** 'HH:MM' the session starts; absent means clock times are not shown. */
  startTime?: string | null;
  busy: boolean;
  onOutcome: (id: string, outcome: Block["outcome"], actualMinutes?: number) => void;
  onMinutes: (id: string, minutes: number) => void;
  onMethod: (id: string, method: string) => void;
  onPerformance: (id: string, performance: Block["performance"]) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onReplan: () => void;
  onStartOver: () => void;
}) {
  const done = plan.blocks.filter((b) => b.kind !== "break" && b.outcome).length;
  const total = plan.blocks.filter((b) => b.kind !== "break").length;

  // Clock times are derived, never stored per block: editing one block's length
  // must shift everything after it without a migration.
  const times = (() => {
    if (!startTime) return null;
    const [h, m] = startTime.split(":").map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    return withClockTimes(plan.blocks, start);
  })();

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
                {times && times.length > 0
                  ? ` · finishes ${clockLabel(times[times.length - 1].endsAt)}`
                  : ""}
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
            {plan.blocks.map((b, i) => {
              const studyOnly = plan.blocks.filter((x) => x.kind !== "break");
              const studyIndex = studyOnly.findIndex((x) => x.id === b.id);
              return (
                <BlockRow
                  key={b.id}
                  block={b}
                  times={times ? times[i] : undefined}
                  first={studyIndex === 0}
                  last={studyIndex === studyOnly.length - 1}
                  onOutcome={onOutcome}
                  onMinutes={onMinutes}
                  onMethod={onMethod}
                  onPerformance={onPerformance}
                  onMove={onMove}
                />
              );
            })}
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
