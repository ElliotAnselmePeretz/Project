import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { cleanTitle } from "@/lib/deadline-utils";

/** Class updates, newest first. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const updates = await db
    .select()
    .from(schema.classUpdates)
    .where(eq(schema.classUpdates.userId, auth.userId))
    .orderBy(desc(schema.classUpdates.receivedAt))
    .limit(200);

  return NextResponse.json({ updates });
}

/** Mark one update read (or unread), or `{ all: true }` to mark everything read. */
export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();

  if (body.all === true) {
    await db.update(schema.classUpdates).set({ read: true }).where(eq(schema.classUpdates.userId, auth.userId));
    return NextResponse.json({ ok: true });
  }

  if (typeof body.id !== "string" || typeof body.read !== "boolean") {
    return NextResponse.json({ error: "Need an update id and a read flag" }, { status: 400 });
  }

  const result = await db
    .update(schema.classUpdates)
    .set({ read: body.read })
    .where(and(eq(schema.classUpdates.id, body.id), eq(schema.classUpdates.userId, auth.userId)));

  if (result.rowsAffected === 0) return NextResponse.json({ error: "No such update" }, { status: 404 });
  return NextResponse.json({ id: body.id, read: body.read });
}

/**
 * Turn a task email into a deadline. Deliberately a button the student
 * presses, not something sync does on its own: the ManageBac calendar feed
 * already brings most tasks in, and automatic copies would duplicate them.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const { id } = await req.json();
  if (typeof id !== "string") return NextResponse.json({ error: "Which update?" }, { status: 400 });

  const [update] = await db
    .select()
    .from(schema.classUpdates)
    .where(and(eq(schema.classUpdates.id, id), eq(schema.classUpdates.userId, auth.userId)));

  if (!update) return NextResponse.json({ error: "No such update" }, { status: 404 });
  if (update.deadlineId) return NextResponse.json({ error: "That is already in your deadlines" }, { status: 409 });
  if (!update.dueAt) {
    return NextResponse.json({ error: "No due date was found in that email to use" }, { status: 400 });
  }

  const title = cleanTitle(update.title.replace(/^new (task|assignment)\s*:\s*/i, "")) || update.title;
  // Same id and source conventions as a deadline added by hand on the Deadlines page.
  const deadlineId = `mn_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

  await db.insert(schema.deadlines).values({
    id: deadlineId,
    userId: auth.userId,
    title,
    description: update.snippet?.slice(0, 500) ?? null,
    dueAt: update.dueAt,
    source: "manual",
    sourceKey: `manual:${deadlineId}`,
    subject: update.subject,
    confidence: 1,
  });

  await db.update(schema.classUpdates).set({ deadlineId, read: true }).where(eq(schema.classUpdates.id, id));

  return NextResponse.json({ deadlineId });
}
