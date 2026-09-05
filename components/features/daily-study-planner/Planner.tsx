"use client";

import { useCallback, useEffect, useState } from "react";
import type { Focus } from "@/lib/daily-study-planner";
import { Banner } from "@/components/ui";
import { CheckIn } from "./CheckIn";
import { PlanView } from "./PlanView";
import { localDate, type Block, type CandidateTask, type Checkin, type PlanResponse } from "./types";

export function Planner() {
  const [planDate] = useState(() => localDate());
  const [tasks, setTasks] = useState<CandidateTask[]>([]);
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/planner?date=${planDate}`);
    if (!res.ok) {
      setError("Could not load the planner.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTasks(data.tasks);
    setCheckin(data.checkin);
    // A saved plan reopens without forcing the check-in again.
    setPlan(
      data.hasPlan
        ? {
            planDate: data.planDate,
            blocks: data.blocks,
            unscheduled: [],
            studyMinutes: data.blocks
              .filter((b: Block) => b.kind !== "break")
              .reduce((n: number, b: Block) => n + b.minutes, 0),
            breakMinutes: data.blocks
              .filter((b: Block) => b.kind === "break")
              .reduce((n: number, b: Block) => n + b.minutes, 0),
            spareMinutes: 0,
            urgentShortfallMinutes: 0,
          }
        : null,
    );
    setLoading(false);
  }, [planDate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate(input: {
    availableMinutes: number;
    focus: Focus;
    answers: CandidateTask[];
    selectedKeys: string[];
    preserve?: boolean;
  }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate,
          availableMinutes: input.availableMinutes,
          focus: input.focus,
          answers: input.answers,
          selectedKeys: input.selectedKeys,
          preserve: input.preserve ?? true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not build the plan.");
        return;
      }
      setPlan(data);
      setCheckin({ availableMinutes: input.availableMinutes, focus: input.focus });
    } finally {
      setBusy(false);
    }
  }

  async function patchBlock(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not update that block.");
      return;
    }
    setPlan((cur) =>
      cur ? { ...cur, blocks: cur.blocks.map((b) => (b.id === id ? data.block : b)) } : cur,
    );
  }

  async function startOver() {
    setBusy(true);
    try {
      await fetch(`/api/planner?date=${planDate}`, { method: "DELETE" });
      setPlan(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading your planner">
        <div className="animate-shimmer h-20 rounded-lg" />
        <div className="animate-shimmer h-28 rounded-lg" />
        <div className="animate-shimmer h-28 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Banner tone="danger">{error}</Banner>}

      {plan ? (
        <PlanView
          plan={plan}
          busy={busy}
          onOutcome={(id, outcome, actualMinutes) =>
            patchBlock(id, { outcome, ...(actualMinutes !== undefined ? { actualMinutes } : {}) })
          }
          onMinutes={(id, minutes) => patchBlock(id, { minutes })}
          onReplan={() =>
            generate({
              availableMinutes: checkin?.availableMinutes ?? 60,
              focus: checkin?.focus ?? "okay",
              answers: tasks,
              selectedKeys: tasks.map((t) => t.key),
            })
          }
          onStartOver={startOver}
        />
      ) : (
        <CheckIn tasks={tasks} initial={checkin} busy={busy} onGenerate={generate} />
      )}
    </div>
  );
}
