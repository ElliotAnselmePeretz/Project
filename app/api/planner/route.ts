import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";
import { SUBJECT_GROUPS } from "@/lib/ib-subjects";
import {
  buildPlan,
  minutesToDeduct,
  replan,
  type Focus,
  type PlanBlock,
  type PlannerTask,
} from "@/lib/daily-study-planner";
import { guessPurpose, defaultEstimate } from "@/lib/planner-sources";

/** 'YYYY-MM-DD' in the student's local timezone; the client supplies it. */
function planDateFrom(req: NextRequest): string {
  const raw = req.nextUrl.searchParams.get("date");
  return /^\d{4}-\d{2}-\d{2}$/.test(raw ?? "") ? raw! : new Date().toISOString().slice(0, 10);
}

async function requireUser(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  return token?.userId ?? null;
}

/**
 * Candidate tasks: open deadlines plus open subject goals, each merged with
 * whatever the student previously told us about it.
 */
async function loadCandidates(userId: string): Promise<PlannerTask[]> {
  const [deadlines, goals, selections, saved] = await Promise.all([
    db
      .select()
      .from(schema.deadlines)
      .where(and(eq(schema.deadlines.userId, userId), eq(schema.deadlines.dismissed, false)))
      .orderBy(asc(schema.deadlines.dueAt)),
    db
      .select()
      .from(schema.subjectGoals)
      .where(and(eq(schema.subjectGoals.userId, userId), eq(schema.subjectGoals.done, false))),
    db.select().from(schema.subjectSelections).where(eq(schema.subjectSelections.userId, userId)),
    db.select().from(schema.plannerTaskState).where(eq(schema.plannerTaskState.userId, userId)),
  ]);

  const subjectByGroup = new Map(selections.map((s) => [s.groupNumber, s.subjectName]));
  const savedByKey = new Map(saved.map((s) => [`${s.sourceType}:${s.sourceId}`, s]));

  const merge = (
    base: Omit<PlannerTask, "difficulty" | "remainingMinutes" | "purpose" | "purposeConfirmed" | "dateConfirmed">,
    guessed: ReturnType<typeof guessPurpose>,
  ): PlannerTask => {
    const prior = savedByKey.get(base.key);
    return {
      ...base,
      difficulty: prior?.difficulty ?? "comfortable",
      remainingMinutes: prior?.remainingMinutes ?? defaultEstimate(guessed),
      purpose: prior?.purpose ?? guessed,
      purposeConfirmed: prior?.purposeConfirmed ?? false,
      dateConfirmed: prior?.dateConfirmed ?? false,
    };
  };

  const fromDeadlines = deadlines.map((d) =>
    merge(
      {
        key: `deadline:${d.id}`,
        sourceType: "deadline",
        sourceId: d.id,
        title: d.title,
        subject: null,
        dueAt: d.dueAt,
        confidence: d.confidence,
      },
      guessPurpose(d.title),
    ),
  );

  const fromGoals = goals.map((g) =>
    merge(
      {
        key: `goal:${g.id}`,
        sourceType: "goal",
        sourceId: g.id,
        title: g.text,
        subject:
          subjectByGroup.get(g.groupNumber) ??
          SUBJECT_GROUPS.find((x) => x.number === g.groupNumber)?.name ??
          null,
        dueAt: null,
        confidence: 1,
      },
      guessPurpose(g.text),
    ),
  );

  return [...fromDeadlines, ...fromGoals];
}

async function loadBlocks(userId: string, planDate: string) {
  return db
    .select()
    .from(schema.plannerBlocks)
    .where(and(eq(schema.plannerBlocks.userId, userId), eq(schema.plannerBlocks.planDate, planDate)))
    .orderBy(asc(schema.plannerBlocks.position));
}

/** Today's saved plan, the check-in, and the candidate tasks. */
export async function GET(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const planDate = planDateFrom(req);
  const [tasks, blocks, checkin] = await Promise.all([
    loadCandidates(userId),
    loadBlocks(userId, planDate),
    db
      .select()
      .from(schema.plannerCheckins)
      .where(
        and(eq(schema.plannerCheckins.userId, userId), eq(schema.plannerCheckins.planDate, planDate)),
      ),
  ]);

  return NextResponse.json({
    planDate,
    tasks,
    blocks,
    checkin: checkin[0] ?? null,
    hasPlan: blocks.length > 0,
  });
}

/**
 * Generate (or regenerate) the plan for a day.
 *
 * A regeneration keeps every block the student has completed or edited: their
 * work and their decisions outrank the algorithm's opinion.
 */
export async function POST(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const planDate: string = /^\d{4}-\d{2}-\d{2}$/.test(body.planDate)
    ? body.planDate
    : new Date().toISOString().slice(0, 10);

  const availableMinutes = Number(body.availableMinutes);
  if (!Number.isFinite(availableMinutes) || availableMinutes < 5 || availableMinutes > 16 * 60) {
    return NextResponse.json({ error: "Available time must be between 5 minutes and 16 hours" }, { status: 400 });
  }
  const focus: Focus = ["low", "okay", "good"].includes(body.focus) ? body.focus : "okay";

  // Persist the student's answers so tomorrow only asks for changes.
  for (const answer of Array.isArray(body.answers) ? body.answers : []) {
    if (typeof answer?.sourceType !== "string" || typeof answer?.sourceId !== "string") continue;
    const minutes = Number(answer.remainingMinutes);
    await db
      .insert(schema.plannerTaskState)
      .values({
        userId,
        sourceType: answer.sourceType,
        sourceId: answer.sourceId,
        difficulty: answer.difficulty ?? "comfortable",
        remainingMinutes: Number.isFinite(minutes) ? Math.min(Math.max(5, minutes), 600) : 60,
        purpose: answer.purpose ?? "practise",
        purposeConfirmed: Boolean(answer.purposeConfirmed),
        dateConfirmed: Boolean(answer.dateConfirmed),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          schema.plannerTaskState.userId,
          schema.plannerTaskState.sourceType,
          schema.plannerTaskState.sourceId,
        ],
        set: {
          difficulty: answer.difficulty ?? "comfortable",
          remainingMinutes: Number.isFinite(minutes) ? Math.min(Math.max(5, minutes), 600) : 60,
          purpose: answer.purpose ?? "practise",
          purposeConfirmed: Boolean(answer.purposeConfirmed),
          dateConfirmed: Boolean(answer.dateConfirmed),
          updatedAt: new Date(),
        },
      });
  }

  const startTime = /^\d{2}:\d{2}$/.test(body.startTime) ? body.startTime : null;

  await db
    .insert(schema.plannerCheckins)
    .values({ userId, planDate, availableMinutes, focus, startTime, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.plannerCheckins.userId, schema.plannerCheckins.planDate],
      set: { availableMinutes, focus, startTime, updatedAt: new Date() },
    });

  const tasks = await loadCandidates(userId);
  const selected: string[] | null = Array.isArray(body.selectedKeys) ? body.selectedKeys : null;
  const chosen = selected ? tasks.filter((t) => selected.includes(t.key)) : tasks;

  // Protect finished and hand-edited blocks across a regeneration.
  const existing = await loadBlocks(userId, planDate);
  const keep = body.preserve === false ? [] : existing.filter((b) => b.outcome !== null || b.edited);

  const plan = keep.length
    ? replan(
        keep.map((b) => ({
          kind: b.kind,
          minutes: b.minutes,
          taskKey: b.taskKey ?? undefined,
          title: b.title,
          subject: b.subject,
          // Carry the whole card across, not just the text: dropping purpose and
          // urgency here made a kept block lose its badges after a replan.
          purpose: (b.purpose as PlanBlock["purpose"]) ?? undefined,
          method: b.method ?? undefined,
          reason: b.reason ?? undefined,
          urgency: (b.urgency as PlanBlock["urgency"]) ?? undefined,
        })),
        chosen,
        { availableMinutes, focus },
      )
    : buildPlan(chosen, { availableMinutes, focus });

  // Replace the day's blocks, carrying kept rows' outcomes back onto them.
  const keptById = new Map(keep.map((b, i) => [i, b]));
  await db
    .delete(schema.plannerBlocks)
    .where(and(eq(schema.plannerBlocks.userId, userId), eq(schema.plannerBlocks.planDate, planDate)));

  const rows = plan.blocks.map((b, position) => {
    const kept = position < keep.length ? keptById.get(position) : undefined;
    return {
      id: `pb_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
      userId,
      planDate,
      position,
      kind: b.kind,
      minutes: b.minutes,
      taskKey: b.taskKey ?? null,
      title: b.title,
      subject: b.subject ?? null,
      purpose: b.purpose ?? null,
      method: b.method ?? null,
      reason: b.reason ?? null,
      urgency: b.urgency ?? null,
      outcome: kept?.outcome ?? null,
      actualMinutes: kept?.actualMinutes ?? null,
      edited: kept?.edited ?? false,
    };
  });
  if (rows.length) await db.insert(schema.plannerBlocks).values(rows);

  return NextResponse.json({
    planDate,
    blocks: await loadBlocks(userId, planDate),
    unscheduled: plan.unscheduled.map((u) => ({
      key: u.task.key,
      title: u.task.title,
      subject: u.task.subject,
      dueAt: u.task.dueAt,
      remainingMinutes: u.task.remainingMinutes,
      urgency: u.urgency,
      reason: u.reason,
    })),
    studyMinutes: plan.studyMinutes,
    breakMinutes: plan.breakMinutes,
    spareMinutes: plan.spareMinutes,
    urgentShortfallMinutes: plan.urgentShortfallMinutes,
  });
}

/**
 * Record how a block went, or change its length.
 *
 * Deliberately never touches the source deadline or goal: finishing a study
 * block is progress, not submission.
 */
export async function PATCH(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, outcome, actualMinutes, minutes } = await req.json();
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  const scope = and(eq(schema.plannerBlocks.id, id), eq(schema.plannerBlocks.userId, userId));
  const [existing] = await db.select().from(schema.plannerBlocks).where(scope);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};

  if (outcome !== undefined) {
    if (outcome !== null && !["finished", "progress", "stuck"].includes(outcome)) {
      return NextResponse.json({ error: "Unknown outcome" }, { status: 400 });
    }
    patch.outcome = outcome;
  }
  if (actualMinutes !== undefined) {
    const n = Number(actualMinutes);
    patch.actualMinutes = Number.isFinite(n) ? Math.min(Math.max(0, n), 600) : null;
  }
  if (minutes !== undefined) {
    const n = Number(minutes);
    if (!Number.isFinite(n) || n < 5 || n > 240) {
      return NextResponse.json({ error: "A block must be between 5 and 240 minutes" }, { status: 400 });
    }
    patch.minutes = Math.round(n);
    patch.edited = true; // a hand-edited block survives the next replan
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  /*
   * Carry the time spent back to the task's remaining estimate, so tomorrow's
   * check-in reflects work already done instead of asking again.
   *
   * We deduct the *difference* against what this block previously applied.
   * Re-recording an outcome, correcting the minutes, or clearing it entirely
   * must all end up at the right total rather than subtracting twice.
   */
  const nextOutcome = (outcome !== undefined ? outcome : existing.outcome) as
    | "finished"
    | "progress"
    | "stuck"
    | null;
  const nextActual = (patch.actualMinutes !== undefined ? patch.actualMinutes : existing.actualMinutes) as
    | number
    | null;
  const nextMinutes = (patch.minutes as number | undefined) ?? existing.minutes;

  const shouldApply = minutesToDeduct(nextOutcome, nextMinutes, nextActual);
  const delta = shouldApply - existing.appliedMinutes;

  if (delta !== 0 && existing.taskKey) {
    const [sourceType, ...rest] = existing.taskKey.split(":");
    const sourceId = rest.join(":");
    if ((sourceType === "deadline" || sourceType === "goal") && sourceId) {
      const taskScope = and(
        eq(schema.plannerTaskState.userId, userId),
        eq(schema.plannerTaskState.sourceType, sourceType),
        eq(schema.plannerTaskState.sourceId, sourceId),
      );
      const [state] = await db.select().from(schema.plannerTaskState).where(taskScope);
      if (state) {
        await db
          .update(schema.plannerTaskState)
          .set({
            // Never below zero, and never above the original estimate when undoing.
            remainingMinutes: Math.max(0, state.remainingMinutes - delta),
            updatedAt: new Date(),
          })
          .where(taskScope);
      }
    }
    patch.appliedMinutes = shouldApply;
  }

  const [row] = await db.update(schema.plannerBlocks).set(patch).where(scope).returning();
  return NextResponse.json({ block: row });
}

/** Clear the day's plan so the check-in can start again. */
export async function DELETE(req: NextRequest) {
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const planDate = planDateFrom(req);
  await db
    .delete(schema.plannerBlocks)
    .where(and(eq(schema.plannerBlocks.userId, userId), eq(schema.plannerBlocks.planDate, planDate)));
  return NextResponse.json({ ok: true });
}
