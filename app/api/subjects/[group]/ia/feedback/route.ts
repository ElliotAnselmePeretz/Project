import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveSubject } from "@/lib/subject-request";
import { validateText } from "@/lib/subject-manager";

type Params = { params: Promise<{ group: string }> };

const MAX_LENGTH = 4000;

function readDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const body = await req.json();
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const response = typeof body.response === "string" && body.response.trim() ? body.response.trim() : null;

  const error =
    validateText(note, "Feedback", MAX_LENGTH) ??
    (response && response.length > MAX_LENGTH ? "That response is too long" : null);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const row = {
    id: crypto.randomUUID(),
    userId,
    groupNumber,
    note,
    response,
    givenAt: readDate(body.givenAt),
  };

  await db.insert(schema.iaFeedback).values(row);
  return NextResponse.json({ feedback: row }, { status: 201 });
}

/** Record what you changed in response to feedback you already logged. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const body = await req.json();
  if (typeof body.id !== "string") return NextResponse.json({ error: "Which entry?" }, { status: 400 });

  const response = typeof body.response === "string" && body.response.trim() ? body.response.trim() : null;
  if (response && response.length > MAX_LENGTH) {
    return NextResponse.json({ error: "That response is too long" }, { status: 400 });
  }

  const result = await db
    .update(schema.iaFeedback)
    .set({ response })
    .where(
      and(
        eq(schema.iaFeedback.id, body.id),
        eq(schema.iaFeedback.userId, userId),
        eq(schema.iaFeedback.groupNumber, groupNumber),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such entry" }, { status: 404 });
  }

  return NextResponse.json({ id: body.id, response });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which entry?" }, { status: 400 });

  const result = await db
    .delete(schema.iaFeedback)
    .where(
      and(
        eq(schema.iaFeedback.id, id),
        eq(schema.iaFeedback.userId, userId),
        eq(schema.iaFeedback.groupNumber, groupNumber),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such entry" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
