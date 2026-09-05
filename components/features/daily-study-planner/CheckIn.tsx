"use client";

import { useState } from "react";
import type { Difficulty, Focus, Purpose } from "@/lib/daily-study-planner";
import { Badge, Banner, Button, Card, CardBody, CountUp, Field, Input, Select, SectionTitle } from "@/components/ui";
import {
  DIFFICULTY_LABELS,
  FOCUS_LABELS,
  PURPOSE_LABELS,
  localTime,
  type CandidateTask,
  type Checkin,
} from "./types";

const TIME_PRESETS = [30, 45, 60, 90, 120, 180];

function dueText(iso: string | null): string {
  if (!iso) return "No date";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Segmented control — used for focus and difficulty so both read the same way. */
function Choice<T extends string>({
  value,
  options,
  onChange,
  labels,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={`rounded-md border px-3 py-1.5 text-xs transition-all duration-200 active:scale-[0.97] ${
            value === opt
              ? "animate-pop border-accent bg-accent-soft font-medium text-accent"
              : "border-border text-muted hover:-translate-y-px hover:border-border-strong hover:text-fg"
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export function CheckIn({
  tasks,
  initial,
  busy,
  onGenerate,
}: {
  tasks: CandidateTask[];
  initial: Checkin | null;
  busy: boolean;
  onGenerate: (input: {
    availableMinutes: number;
    focus: Focus;
    answers: CandidateTask[];
    selectedKeys: string[];
    startTime: string;
  }) => void;
}) {
  const [minutes, setMinutes] = useState(initial?.availableMinutes ?? 60);
  const [focus, setFocus] = useState<Focus>(initial?.focus ?? "okay");
  const [startTime, setStartTime] = useState(initial?.startTime ?? localTime());
  const [answers, setAnswers] = useState<CandidateTask[]>(tasks);
  const [selected, setSelected] = useState<Set<string>>(new Set(tasks.map((t) => t.key)));

  function update(key: string, patch: Partial<CandidateTask>) {
    setAnswers((cur) => cur.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function toggle(key: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const chosen = answers.filter((t) => selected.has(t.key));
  const totalEstimate = chosen.reduce((n, t) => n + t.remainingMinutes, 0);

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <Field label="How long have you got?" hint="Including breaks.">
            <div className="flex flex-wrap items-center gap-1.5">
              {TIME_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  aria-pressed={minutes === m}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-all duration-200 active:scale-[0.97] ${
                    minutes === m
                      ? "animate-pop border-accent bg-accent-soft font-medium text-accent"
                      : "border-border text-muted hover:-translate-y-px hover:border-border-strong hover:text-fg"
                  }`}
                >
                  {m >= 60 ? `${m / 60}h` : `${m}m`}
                </button>
              ))}
              <Input
                type="number"
                min={5}
                max={960}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                aria-label="Minutes available"
                className="w-24"
              />
            </div>
          </Field>

          <Field label="Starting when?" hint="Used to put clock times on each block.">
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              aria-label="Session start time"
              className="w-32"
            />
          </Field>

          <Field label="How's your focus?">
            <Choice
              value={focus}
              options={["low", "okay", "good"] as const}
              onChange={setFocus}
              labels={FOCUS_LABELS}
            />
          </Field>
        </CardBody>
      </Card>

      <section>
        <SectionTitle>Today's work</SectionTitle>

        {answers.length === 0 ? (
          <Banner tone="info">
            No open deadlines or subject goals yet. Add a deadline or a subject goal, then come back.
          </Banner>
        ) : (
          <div className="stagger space-y-2">
            {answers.map((t) => {
              const isSelected = selected.has(t.key);
              const uncertainDate = t.dueAt !== null && t.confidence < 1 && !t.dateConfirmed;
              return (
                <Card
                  key={t.key}
                  className={`transition-all duration-300 ${isSelected ? "" : "scale-[0.99] opacity-50"}`}
                >
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {t.subject && <Badge tone="neutral">{t.subject}</Badge>}
                          <Badge tone={t.sourceType === "goal" ? "info" : "accent"}>
                            {t.sourceType === "goal" ? "goal" : "deadline"}
                          </Badge>
                          {!t.purposeConfirmed && (
                            <span className="text-[10px] text-faint" title="We guessed this from the title">
                              suggested type
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 font-medium text-fg">{t.title}</p>
                        <p className="text-xs text-muted">{dueText(t.dueAt)}</p>
                      </div>

                      <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(t.key)}
                          aria-label={`Include ${t.title}`}
                        />
                        Include
                      </label>
                    </div>

                    {uncertainDate && (
                      <Banner tone="warning">
                        This date was inferred from an email, not read from a calendar. Confirm it before the
                        planner treats it as a deadline.
                        <span className="mt-2 block">
                          <Button size="sm" onClick={() => update(t.key, { dateConfirmed: true })}>
                            The date is right
                          </Button>
                        </span>
                      </Banner>
                    )}

                    {isSelected && (
                      <div className="animate-fade-up grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div className="space-y-3">
                          <Field label="How does it feel?">
                            <Choice
                              value={t.difficulty}
                              options={["comfortable", "challenging", "stuck"] as const}
                              onChange={(v: Difficulty) => update(t.key, { difficulty: v })}
                              labels={DIFFICULTY_LABELS}
                            />
                          </Field>
                          <Field label="What kind of work is it?">
                            <Select
                              value={t.purpose}
                              onChange={(e) =>
                                update(t.key, { purpose: e.target.value as Purpose, purposeConfirmed: true })
                              }
                            >
                              {(Object.keys(PURPOSE_LABELS) as Purpose[]).map((p) => (
                                <option key={p} value={p}>
                                  {PURPOSE_LABELS[p]}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </div>

                        <Field label="Work left" hint="Minutes">
                          <Input
                            type="number"
                            min={5}
                            max={600}
                            step={5}
                            value={t.remainingMinutes}
                            onChange={(e) => update(t.key, { remainingMinutes: Number(e.target.value) })}
                            aria-label={`Minutes remaining for ${t.title}`}
                            className="w-28"
                          />
                        </Field>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <CountUp value={chosen.length} /> selected · about{" "}
          <CountUp value={Math.round(totalEstimate / 60 * 10) / 10} />h of work ·{" "}
          <CountUp value={minutes} />m available
        </p>
        <Button
          variant="primary"
          disabled={busy || chosen.length === 0}
          onClick={() =>
            onGenerate({
              availableMinutes: minutes,
              focus,
              answers,
              selectedKeys: [...selected],
              startTime,
            })
          }
        >
          {busy ? "Planning…" : "Make today's plan"}
        </Button>
      </div>
    </div>
  );
}
