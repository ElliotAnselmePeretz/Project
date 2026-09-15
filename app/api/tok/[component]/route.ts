import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { isValidComponent, isValidTokStage, isValidTokGrade } from "@/lib/tok";

type Params = { params: Promise<{ component: string }> };

const NUMBER_FIELDS = ["wordCount", "wordLimit"] as const;
const DATE_FIELDS = ["draftDueAt", "finalDueAt"] as const;

export async function GET(req: NextRequest, { params }: Params) {
  const { component } = await params;
  if (!isValidComponent(component)) {
    return NextResponse.json({ error: "Unknown TOK component" }, { status: 404 });
  }
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const [row] = await db
    .select()
    .from(schema.tokComponents)
    .where(
      and(
        eq(schema.tokComponents.userId, auth.userId),
        eq(schema.tokComponents.component, component),
      ),
    );

  return NextResponse.json({ component: row ?? null });
}

/** Update any subset of one component's fields. Absent keys are left alone. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { component } = await params;
  if (!isValidComponent(component)) {
    return NextResponse.json({ error: "Unknown TOK component" }, { status: 404 });
  }
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const patch: Record<string, unknown> = {};

  if ("title" in body) {
    const value = body.title;
    if (value !== null && typeof value !== "string") {
      return NextResponse.json({ error: "That must be text" }, { status: 400 });
    }
    if (typeof value === "string" && value.length > 500) {
      return NextResponse.json({ error: "That is too long (500 characters max)" }, { status: 400 });
    }
    patch.title = typeof value === "string" && value.trim() ? value.trim() : null;
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
    if (body.stage !== null && !isValidTokStage(body.stage)) {
      return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
    }
    patch.stage = body.stage;
  }

  if ("predictedGrade" in body) {
    if (body.predictedGrade !== null && !isValidTokGrade(body.predictedGrade)) {
      return NextResponse.json({ error: "Predicted grade must be A to E" }, { status: 400 });
    }
    patch.predictedGrade = body.predictedGrade;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  patch.updatedAt = new Date();

  await db
    .insert(schema.tokComponents)
    .values({ userId: auth.userId, component, ...patch })
    .onConflictDoUpdate({
      target: [schema.tokComponents.userId, schema.tokComponents.component],
      set: patch,
    });

  return NextResponse.json({ saved: true });
}
