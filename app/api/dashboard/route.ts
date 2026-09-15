import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { buildAgenda, type AgendaItem } from "@/lib/dashboard";
import { averagePercent } from "@/lib/subject-manager";
import { casTotals } from "@/lib/cas";
import { defaultAssessmentLabel, stagesFor, stageIndex } from "@/lib/ia";
import { EE_STAGES, eeStageIndex } from "@/lib/ee";
import { COMPONENT_META, stagesForComponent, tokStageIndex, isValidComponent } from "@/lib/tok";
import { SCOPE_LABELS, isValidScope } from "@/lib/work";

/** Label of a stage by index, or null before anything has started. */
function stageLabel(labels: { label: string }[], index: number): string | null {
  return index >= 0 ? labels[index].label : null;
}

/**
 * Everything the dashboard shows, in one request. Read-only: the dashboard is
 * a window onto the other pages, and every item links back to where it is
 * actually edited.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.userId;

  const [
    deadlines,
    selections,
    ias,
    assessments,
    targets,
    subjectGoals,
    workGoals,
    essays,
    tokRows,
    casRows,
  ] = await Promise.all([
    db
      .select()
      .from(schema.deadlines)
      .where(and(eq(schema.deadlines.userId, userId), eq(schema.deadlines.dismissed, false))),
    db.select().from(schema.subjectSelections).where(eq(schema.subjectSelections.userId, userId)),
    db.select().from(schema.subjectIas).where(eq(schema.subjectIas.userId, userId)),
    db.select().from(schema.assessments).where(eq(schema.assessments.userId, userId)),
    db.select().from(schema.subjectTargets).where(eq(schema.subjectTargets.userId, userId)),
    db
      .select()
      .from(schema.subjectGoals)
      .where(and(eq(schema.subjectGoals.userId, userId), eq(schema.subjectGoals.done, false))),
    db
      .select()
      .from(schema.workGoals)
      .where(and(eq(schema.workGoals.userId, userId), eq(schema.workGoals.done, false))),
    db.select().from(schema.extendedEssays).where(eq(schema.extendedEssays.userId, userId)),
    db.select().from(schema.tokComponents).where(eq(schema.tokComponents.userId, userId)),
    db.select().from(schema.casActivities).where(eq(schema.casActivities.userId, userId)),
  ]);

  const subjectName = new Map(selections.map((s) => [s.groupNumber, s.subjectName]));

  /* ---------------------------------------------------------------- agenda */

  const raw: AgendaItem[] = [];

  for (const d of deadlines) {
    raw.push({
      id: `deadline:${d.id}`,
      kind: "deadline",
      title: d.title,
      context: d.subject ?? null,
      dueAt: d.dueAt,
      href: "/deadlines",
    });
  }

  for (const ia of ias) {
    const name = subjectName.get(ia.groupNumber);
    if (!name) continue; // an IA for a subject the student no longer takes
    const label = ia.label ?? defaultAssessmentLabel(ia.groupNumber);
    const href = `/subjects/${ia.groupNumber}/ia`;
    if (ia.draftDueAt) {
      raw.push({ id: `ia-draft:${ia.groupNumber}`, kind: "ia", title: `${label} draft`, context: name, dueAt: ia.draftDueAt, href });
    }
    if (ia.finalDueAt) {
      raw.push({ id: `ia-final:${ia.groupNumber}`, kind: "ia", title: `${label} final`, context: name, dueAt: ia.finalDueAt, href });
    }
  }

  const essay = essays[0];
  if (essay?.draftDueAt) {
    raw.push({ id: "ee-draft", kind: "ee", title: "EE draft", context: essay.subject, dueAt: essay.draftDueAt, href: "/ee" });
  }
  if (essay?.finalDueAt) {
    raw.push({ id: "ee-final", kind: "ee", title: "EE final", context: essay.subject, dueAt: essay.finalDueAt, href: "/ee" });
  }

  for (const t of tokRows) {
    if (!isValidComponent(t.component)) continue;
    const label = COMPONENT_META[t.component].label;
    const href = `/tok/${t.component}`;
    if (t.draftDueAt) {
      raw.push({ id: `tok-draft:${t.component}`, kind: "tok", title: `${label} draft`, context: "TOK", dueAt: t.draftDueAt, href });
    }
    if (t.finalDueAt) {
      raw.push({ id: `tok-final:${t.component}`, kind: "tok", title: `${label} final`, context: "TOK", dueAt: t.finalDueAt, href });
    }
  }

  // The calendar needs every dated item, not just the upcoming window, so it
  // can show past weeks too. The agenda list is the filtered, sorted view.
  const agenda = buildAgenda(raw);

  /* ----------------------------------------------------------------- goals */

  const goals = [
    ...subjectGoals.map((g) => ({
      id: `subject:${g.id}`,
      text: g.text,
      context: subjectName.get(g.groupNumber) ?? `Group ${g.groupNumber}`,
      href: `/subjects/${g.groupNumber}`,
      createdAt: g.createdAt,
    })),
    ...workGoals
      .filter((g) => isValidScope(g.scope))
      .map((g) => ({
        id: `work:${g.id}`,
        text: g.text,
        context: SCOPE_LABELS[g.scope as keyof typeof SCOPE_LABELS],
        href: g.scope === "ee" ? "/ee/work" : g.scope === "cas" ? "/cas" : `/tok/${g.scope.replace("tok-", "")}/work`,
        createdAt: g.createdAt,
      })),
  ].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

  /* -------------------------------------------------------------- subjects */

  const subjects = [...selections]
    .sort((a, b) => a.groupNumber - b.groupNumber)
    .map((s) => {
      const ia = ias.find((i) => i.groupNumber === s.groupNumber);
      return {
        groupNumber: s.groupNumber,
        name: s.subjectName,
        level: s.level,
        averagePercent: averagePercent(assessments.filter((a) => a.groupNumber === s.groupNumber)),
        targetGrade: targets.find((t) => t.groupNumber === s.groupNumber)?.targetGrade ?? null,
        iaLabel: ia?.label ?? defaultAssessmentLabel(s.groupNumber),
        iaStage: stageLabel(stagesFor(s.groupNumber), stageIndex(ia?.stage ?? null)),
      };
    });

  /* ------------------------------------------------------------------ core */

  const tok = (["exhibition", "essay"] as const).map((component) => {
    const row = tokRows.find((t) => t.component === component);
    return {
      component,
      label: COMPONENT_META[component].label,
      stage: stageLabel(stagesForComponent(component), tokStageIndex(row?.stage ?? null)),
      predictedGrade: row?.predictedGrade ?? null,
    };
  });

  const cas = casTotals(casRows);

  return NextResponse.json({
    agenda,
    calendar: raw.filter((i) => !Number.isNaN(i.dueAt.getTime())),
    goals: goals.slice(0, 8),
    openGoalCount: goals.length,
    subjects,
    core: {
      ee: essay
        ? {
            stage: stageLabel(EE_STAGES, eeStageIndex(essay.stage)),
            predictedGrade: essay.predictedGrade,
            wordCount: essay.wordCount,
            wordLimit: essay.wordLimit,
          }
        : null,
      tok,
      cas: {
        totalHours: cas.totalHours,
        byStrand: cas.byStrand,
        activityCount: cas.activityCount,
        hasProject: casRows.some((a) => a.isProject),
      },
    },
  });
}
