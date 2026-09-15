import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";
import { validateSelections, type SubjectSelectionInput } from "@/lib/ib-subjects";
import { averagePercent } from "@/lib/subject-manager";

/**
 * The student's six subjects.
 *
 * `?summary=1` adds each subject's target, average and outstanding goals, so
 * the overview page can render every card from one request. The picker doesn't
 * need any of that, so it stays opt-in.
 */
export async function GET(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const userId = token.userId;

  const rows = await db
    .select()
    .from(schema.subjectSelections)
    .where(eq(schema.subjectSelections.userId, userId));

  if (req.nextUrl.searchParams.get("summary") !== "1") {
    return NextResponse.json({ subjects: rows });
  }

  const [assessments, targets, goals] = await Promise.all([
    db.select().from(schema.assessments).where(eq(schema.assessments.userId, userId)),
    db.select().from(schema.subjectTargets).where(eq(schema.subjectTargets.userId, userId)),
    db
      .select()
      .from(schema.subjectGoals)
      .where(and(eq(schema.subjectGoals.userId, userId), eq(schema.subjectGoals.done, false))),
  ]);

  const subjects = rows.map((row) => {
    const mine = assessments.filter((a) => a.groupNumber === row.groupNumber);
    return {
      ...row,
      targetGrade: targets.find((t) => t.groupNumber === row.groupNumber)?.targetGrade ?? null,
      averagePercent: averagePercent(mine),
      assessmentCount: mine.length,
      openGoalCount: goals.filter((g) => g.groupNumber === row.groupNumber).length,
    };
  });

  return NextResponse.json({ subjects });
}

export async function PUT(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { subjects } = await req.json();
  if (!Array.isArray(subjects)) {
    return NextResponse.json({ error: "Expected a list of subjects" }, { status: 400 });
  }

  const error = validateSelections(subjects as SubjectSelectionInput[]);
  if (error) return NextResponse.json({ error }, { status: 400 });

  await db.delete(schema.subjectSelections).where(eq(schema.subjectSelections.userId, token.userId));
  await db.insert(schema.subjectSelections).values(
    (subjects as SubjectSelectionInput[]).map((s) => ({
      userId: token.userId!,
      groupNumber: s.groupNumber,
      subjectName: s.subjectName,
      level: s.level as "HL" | "SL",
    })),
  );

  return NextResponse.json({ saved: true });
}
