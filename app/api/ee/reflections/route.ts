import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { isValidReflection } from "@/lib/ee";

const MAX_LENGTH = 10_000;

/**
 * Write one of the three reflection slots. Upserts rather than creates, since
 * the slots are fixed — a student revises a reflection, they do not add a
 * fourth one.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  if (!isValidReflection(body.sessionKey)) {
    return NextResponse.json({ error: "Unknown reflection session" }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: "That reflection is too long" }, { status: 400 });
  }

  let heldAt: Date | null = null;
  if (body.heldAt) {
    const date = new Date(body.heldAt);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "That date could not be read" }, { status: 400 });
    }
    heldAt = date;
  }

  const values = {
    userId: auth.userId,
    sessionKey: body.sessionKey as string,
    body: text || null,
    heldAt,
    updatedAt: new Date(),
  };

  await db
    .insert(schema.eeReflections)
    .values(values)
    .onConflictDoUpdate({
      target: [schema.eeReflections.userId, schema.eeReflections.sessionKey],
      set: { body: values.body, heldAt, updatedAt: values.updatedAt },
    });

  return NextResponse.json({ saved: true });
}
