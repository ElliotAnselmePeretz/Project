import { NextResponse, type NextRequest } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveSubject } from "@/lib/subject-request";
import { validateTargetGrade } from "@/lib/subject-manager";

type Params = { params: Promise<{ group: string }> };

/** Everything the subject page needs, in one request. */
export async function GET(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber, selection } = resolved.ctx;

  const [assessments, targets, goals, notes] = await Promise.all([
    db
      .select()
      .from(schema.assessments)
      .where(and(eq(schema.assessments.userId, userId), eq(schema.assessments.groupNumber, groupNumber)))
      .orderBy(desc(schema.assessments.createdAt)),
    db
      .select()
      .from(schema.subjectTargets)
      .where(
        and(eq(schema.subjectTargets.userId, userId), eq(schema.subjectTargets.groupNumber, groupNumber)),
      ),
    db
      .select()
      .from(schema.subjectGoals)
      .where(and(eq(schema.subjectGoals.userId, userId), eq(schema.subjectGoals.groupNumber, groupNumber)))
      .orderBy(asc(schema.subjectGoals.done), desc(schema.subjectGoals.createdAt)),
    db
      .select()
      .from(schema.subjectNotes)
      .where(and(eq(schema.subjectNotes.userId, userId), eq(schema.subjectNotes.groupNumber, groupNumber)))
      .orderBy(desc(schema.subjectNotes.updatedAt)),
  ]);

  return NextResponse.json({
    subject: {
      groupNumber,
      name: selection.subjectName,
      level: selection.level,
    },
    assessments,
    targetGrade: targets[0]?.targetGrade ?? null,
    goals,
    notes,
  });
}

/** Set or clear the target grade. Send `null` to clear it. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const { targetGrade } = await req.json();

  if (targetGrade === null) {
    await db
      .delete(schema.subjectTargets)
      .where(
        and(eq(schema.subjectTargets.userId, userId), eq(schema.subjectTargets.groupNumber, groupNumber)),
      );
    return NextResponse.json({ targetGrade: null });
  }

  const error = validateTargetGrade(targetGrade);
  if (error) return NextResponse.json({ error }, { status: 400 });

  await db
    .insert(schema.subjectTargets)
    .values({ userId, groupNumber, targetGrade })
    .onConflictDoUpdate({
      target: [schema.subjectTargets.userId, schema.subjectTargets.groupNumber],
      set: { targetGrade, updatedAt: new Date() },
    });

  return NextResponse.json({ targetGrade });
}
