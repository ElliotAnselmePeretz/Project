import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { isValidScope } from "@/lib/work";
import { validateText } from "@/lib/subject-manager";

type Params = { params: Promise<{ scope: string }> };

const MAX_TITLE = 120;
const MAX_BODY = 20_000;

async function resolve(req: NextRequest, params: Params["params"]) {
  const { scope } = await params;
  if (!isValidScope(scope)) {
    return { error: NextResponse.json({ error: "Unknown area" }, { status: 404 }) };
  }
  const auth = await requireUser(req);
  if ("error" in auth) return { error: auth.error };
  return { userId: auth.userId, scope };
}

function readNote(body: Record<string, unknown>) {
  const noteBody = typeof body.body === "string" ? body.body.trim() : "";
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
  const error =
    validateText(noteBody, "Note", MAX_BODY) ??
    (title && title.length > MAX_TITLE ? "That title is too long (120 characters max)" : null);
  return { noteBody, title, error };
}

export async function GET(req: NextRequest, { params }: Params) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;

  const notes = await db
    .select()
    .from(schema.workNotes)
    .where(and(eq(schema.workNotes.userId, r.userId), eq(schema.workNotes.scope, r.scope)))
    .orderBy(desc(schema.workNotes.updatedAt));

  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest, { params }: Params) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;

  const { noteBody, title, error } = readNote(await req.json());
  if (error) return NextResponse.json({ error }, { status: 400 });

  const row = {
    id: crypto.randomUUID(),
    userId: r.userId,
    scope: r.scope,
    title,
    body: noteBody,
    updatedAt: new Date(),
  };

  await db.insert(schema.workNotes).values(row);
  return NextResponse.json({ note: row }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;

  const payload = await req.json();
  if (typeof payload.id !== "string") {
    return NextResponse.json({ error: "Which note?" }, { status: 400 });
  }

  const { noteBody, title, error } = readNote(payload);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const result = await db
    .update(schema.workNotes)
    .set({ title, body: noteBody, updatedAt: new Date() })
    .where(
      and(
        eq(schema.workNotes.id, payload.id),
        eq(schema.workNotes.userId, r.userId),
        eq(schema.workNotes.scope, r.scope),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such note" }, { status: 404 });
  }

  return NextResponse.json({ id: payload.id });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which note?" }, { status: 400 });

  const result = await db
    .delete(schema.workNotes)
    .where(
      and(
        eq(schema.workNotes.id, id),
        eq(schema.workNotes.userId, r.userId),
        eq(schema.workNotes.scope, r.scope),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such note" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
