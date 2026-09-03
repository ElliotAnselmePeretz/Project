import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveSubject } from "@/lib/subject-request";
import { validateText } from "@/lib/subject-manager";

type Params = { params: Promise<{ group: string }> };

const MAX_GOAL_LENGTH = 200;

export async function POST(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const body = await req.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";

  const error = validateText(text, "Goal", MAX_GOAL_LENGTH);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const row = { id: crypto.randomUUID(), userId, groupNumber, text, done: false };
  await db.insert(schema.subjectGoals).values(row);
  return NextResponse.json({ goal: row }, { status: 201 });
}

/** Tick or untick a goal. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const { id, done } = await req.json();
  if (typeof id !== "string" || typeof done !== "boolean") {
    return NextResponse.json({ error: "Need a goal id and a done flag" }, { status: 400 });
  }

  const result = await db
    .update(schema.subjectGoals)
    .set({ done })
    .where(
      and(
        eq(schema.subjectGoals.id, id),
        eq(schema.subjectGoals.userId, userId),
        eq(schema.subjectGoals.groupNumber, groupNumber),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such goal" }, { status: 404 });
  }

  return NextResponse.json({ id, done });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which goal?" }, { status: 400 });

  const result = await db
    .delete(schema.subjectGoals)
    .where(
      and(
        eq(schema.subjectGoals.id, id),
        eq(schema.subjectGoals.userId, userId),
        eq(schema.subjectGoals.groupNumber, groupNumber),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such goal" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
