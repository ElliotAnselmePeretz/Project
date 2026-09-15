import { NextResponse, type NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { isValidEeStage, isValidEeGrade } from "@/lib/ee";

/** Everything the EE page needs, in one request. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const [essays, reflections] = await Promise.all([
    db.select().from(schema.extendedEssays).where(eq(schema.extendedEssays.userId, auth.userId)),
    db
      .select()
      .from(schema.eeReflections)
      .where(eq(schema.eeReflections.userId, auth.userId))
      .orderBy(asc(schema.eeReflections.sessionKey)),
  ]);

  return NextResponse.json({ essay: essays[0] ?? null, reflections });
}

const TEXT_FIELDS = ["title", "researchQuestion", "subject", "topic", "supervisor"] as const;
const NUMBER_FIELDS = ["wordCount", "wordLimit"] as const;
const DATE_FIELDS = ["draftDueAt", "finalDueAt"] as const;

/** Update any subset of the essay's fields. Absent keys are left alone. */
export async function PUT(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const patch: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value !== null && typeof value !== "string") {
      return NextResponse.json({ error: "That field must be text" }, { status: 400 });
    }
    if (typeof value === "string" && value.length > 500) {
      return NextResponse.json({ error: "That is too long (500 characters max)" }, { status: 400 });
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
    if (body.stage !== null && !isValidEeStage(body.stage)) {
      return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
    }
    patch.stage = body.stage;
  }

  if ("predictedGrade" in body) {
    if (body.predictedGrade !== null && !isValidEeGrade(body.predictedGrade)) {
      return NextResponse.json({ error: "Predicted grade must be A to E" }, { status: 400 });
    }
    patch.predictedGrade = body.predictedGrade;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  patch.updatedAt = new Date();

  await db
    .insert(schema.extendedEssays)
    .values({ userId: auth.userId, ...patch })
    .onConflictDoUpdate({ target: schema.extendedEssays.userId, set: patch });

  return NextResponse.json({ saved: true });
}
