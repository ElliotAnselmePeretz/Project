import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveSubject } from "@/lib/subject-request";
import { validateText } from "@/lib/subject-manager";

type Params = { params: Promise<{ group: string }> };

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 20_000;

export async function POST(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const body = await req.json();
  const noteBody = typeof body.body === "string" ? body.body.trim() : "";
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;

  const error =
    validateText(noteBody, "Note", MAX_BODY_LENGTH) ??
    (title && title.length > MAX_TITLE_LENGTH ? "That title is too long (120 characters max)" : null);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const row = {
    id: crypto.randomUUID(),
    userId,
    groupNumber,
    title,
    body: noteBody,
    updatedAt: new Date(),
  };

  await db.insert(schema.subjectNotes).values(row);
  return NextResponse.json({ note: row }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const payload = await req.json();
  if (typeof payload.id !== "string") {
    return NextResponse.json({ error: "Which note?" }, { status: 400 });
  }

  const noteBody = typeof payload.body === "string" ? payload.body.trim() : "";
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : null;

  const error =
    validateText(noteBody, "Note", MAX_BODY_LENGTH) ??
    (title && title.length > MAX_TITLE_LENGTH ? "That title is too long (120 characters max)" : null);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const result = await db
    .update(schema.subjectNotes)
    .set({ title, body: noteBody, updatedAt: new Date() })
    .where(
      and(
        eq(schema.subjectNotes.id, payload.id),
        eq(schema.subjectNotes.userId, userId),
        eq(schema.subjectNotes.groupNumber, groupNumber),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such note" }, { status: 404 });
  }

  return NextResponse.json({ id: payload.id });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { group } = await params;
  const resolved = await resolveSubject(req, group);
  if ("error" in resolved) return resolved.error;
  const { userId, groupNumber } = resolved.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which note?" }, { status: 400 });

  const result = await db
    .delete(schema.subjectNotes)
    .where(
      and(
        eq(schema.subjectNotes.id, id),
        eq(schema.subjectNotes.userId, userId),
        eq(schema.subjectNotes.groupNumber, groupNumber),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such note" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
