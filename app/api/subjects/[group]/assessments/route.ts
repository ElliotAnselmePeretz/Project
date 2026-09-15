import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveSubject } from "@/lib/subject-request";
import { validateAssessment } from "@/lib/subject-manager";

type Params = { params: Promise<{ group: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const body = await req.json();
  const input = {
    title: typeof body.title === "string" ? body.title.trim() : "",
    mark: Number(body.mark),
    maxMark: Number(body.maxMark),
    weight: body.weight === "" || body.weight == null ? null : Number(body.weight),
  };

  const error = validateAssessment(input);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const takenAt = body.takenAt ? new Date(body.takenAt) : null;

  const row = {
    id: crypto.randomUUID(),
    userId,
    groupNumber,
    title: input.title,
    mark: input.mark,
    maxMark: input.maxMark,
    weight: input.weight,
    takenAt: takenAt && !Number.isNaN(takenAt.getTime()) ? takenAt : null,
  };

  await db.insert(schema.assessments).values(row);
  return NextResponse.json({ assessment: row }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which assessment?" }, { status: 400 });

  // Scoped to this user and group, so an id alone cannot reach anyone else's row.
  const result = await db
    .delete(schema.assessments)
    .where(
      and(
        eq(schema.assessments.id, id),
        eq(schema.assessments.userId, userId),
        eq(schema.assessments.groupNumber, groupNumber),
      ),
    );

  // Nothing matched: either it never existed or it is not this user's to delete.
  // Say so rather than reporting a success that did not happen.
  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such assessment" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
