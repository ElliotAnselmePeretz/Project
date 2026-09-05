import { NextResponse, type NextRequest } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveSubject } from "@/lib/subject-request";
import { defaultAssessmentLabel, isValidStage, lengthUnitFor } from "@/lib/ia";

type Params = { params: Promise<{ group: string }> };

/** Everything the IA page needs, in one request. */
export async function GET(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber, selection } = resolved.ctx;

  const [ias, criteria, feedback] = await Promise.all([
    db
      .select()
      .from(schema.subjectIas)
      .where(and(eq(schema.subjectIas.userId, userId), eq(schema.subjectIas.groupNumber, groupNumber))),
    db
      .select()
      .from(schema.iaCriteria)
      .where(and(eq(schema.iaCriteria.userId, userId), eq(schema.iaCriteria.groupNumber, groupNumber)))
      .orderBy(asc(schema.iaCriteria.createdAt)),
    db
      .select()
      .from(schema.iaFeedback)
      .where(and(eq(schema.iaFeedback.userId, userId), eq(schema.iaFeedback.groupNumber, groupNumber)))
      .orderBy(desc(schema.iaFeedback.createdAt)),
  ]);

  const ia = ias[0] ?? null;

  return NextResponse.json({
    subject: { groupNumber, name: selection.subjectName, level: selection.level },
    // The stored label wins; otherwise fall back to the group's default, so an
    // IA that has never been edited still shows "IA" or "IOA" correctly.
    label: ia?.label ?? defaultAssessmentLabel(groupNumber),
    lengthUnit: lengthUnitFor(groupNumber),
    ia,
    criteria,
    feedback,
  });
}

const TEXT_FIELDS = ["label", "title", "supervisor"] as const;
const NUMBER_FIELDS = ["lengthCount", "lengthLimit"] as const;
const DATE_FIELDS = ["draftDueAt", "finalDueAt"] as const;

/** Update any subset of the IA's own fields. Absent keys are left alone. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const body = await req.json();
  const patch: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value !== null && typeof value !== "string") {
      return NextResponse.json({ error: `${field} must be text` }, { status: 400 });
    }
    if (typeof value === "string" && value.length > 300) {
      return NextResponse.json({ error: `That ${field} is too long (300 characters max)` }, { status: 400 });
    }
    patch[field] = typeof value === "string" && value.trim() ? value.trim() : null;
  }

  for (const field of NUMBER_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value === null || value === "") {
      patch[field] = null;
      continue;
    }
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      return NextResponse.json({ error: "That must be a whole number, 0 or higher" }, { status: 400 });
    }
    patch[field] = n;
  }

  for (const field of DATE_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value === null || value === "") {
      patch[field] = null;
      continue;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "That date could not be read" }, { status: 400 });
    }
    patch[field] = date;
  }

  if ("stage" in body) {
    if (body.stage !== null && !isValidStage(body.stage)) {
      return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
    }
    patch.stage = body.stage;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  patch.updatedAt = new Date();

  await db
    .insert(schema.subjectIas)
    .values({ userId, groupNumber, ...patch })
    .onConflictDoUpdate({
      target: [schema.subjectIas.userId, schema.subjectIas.groupNumber],
      set: patch,
    });

  return NextResponse.json({ saved: true });
}
