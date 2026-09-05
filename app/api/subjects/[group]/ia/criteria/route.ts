import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveSubject } from "@/lib/subject-request";
import { validateCriterion, validateSelfMark } from "@/lib/ia";

type Params = { params: Promise<{ group: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const maxMark = Number(body.maxMark);

  const error = validateCriterion(name, maxMark);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const row = { id: crypto.randomUUID(), userId, groupNumber, name, maxMark, selfMark: null };
  await db.insert(schema.iaCriteria).values(row);
  return NextResponse.json({ criterion: row }, { status: 201 });
}

/** Score yourself against one criterion. Send null to clear the score. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const { id, selfMark } = await req.json();
  if (typeof id !== "string") {
    return NextResponse.json({ error: "Which criterion?" }, { status: 400 });
  }

  const [criterion] = await db
    .select()
    .from(schema.iaCriteria)
    .where(
      and(
        eq(schema.iaCriteria.id, id),
        eq(schema.iaCriteria.userId, userId),
        eq(schema.iaCriteria.groupNumber, groupNumber),
      ),
    );

  if (!criterion) return NextResponse.json({ error: "No such criterion" }, { status: 404 });

  const value = selfMark === null || selfMark === "" ? null : Number(selfMark);
  const error = validateSelfMark(value, criterion.maxMark);
  if (error) return NextResponse.json({ error }, { status: 400 });

  await db.update(schema.iaCriteria).set({ selfMark: value }).where(eq(schema.iaCriteria.id, id));
  return NextResponse.json({ id, selfMark: value });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which criterion?" }, { status: 400 });

  const result = await db
    .delete(schema.iaCriteria)
    .where(
      and(
        eq(schema.iaCriteria.id, id),
        eq(schema.iaCriteria.userId, userId),
        eq(schema.iaCriteria.groupNumber, groupNumber),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such criterion" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
