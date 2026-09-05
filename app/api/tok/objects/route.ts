import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { isValidObjectSlot } from "@/lib/tok";

const MAX_LENGTH = 4000;

function readField(value: unknown): { value: string | null; tooLong: boolean } {
  if (typeof value !== "string") return { value: null, tooLong: false };
  const trimmed = value.trim();
  return { value: trimmed || null, tooLong: trimmed.length > MAX_LENGTH };
}

/**
 * Write one of the three object slots. Upserts, since the slots are fixed —
 * a student swaps out an object, they do not add a fourth.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  if (!isValidObjectSlot(body.slot)) {
    return NextResponse.json({ error: "The exhibition has three objects, numbered 1 to 3" }, { status: 400 });
  }

  const name = readField(body.name);
  const context = readField(body.context);
  const link = readField(body.link);

  if (name.tooLong || context.tooLong || link.tooLong) {
    return NextResponse.json({ error: "That is too long" }, { status: 400 });
  }

  const values = {
    userId: auth.userId,
    slot: body.slot as number,
    name: name.value,
    context: context.value,
    link: link.value,
    updatedAt: new Date(),
  };

  await db
    .insert(schema.tokObjects)
    .values(values)
    .onConflictDoUpdate({
      target: [schema.tokObjects.userId, schema.tokObjects.slot],
      set: {
        name: values.name,
        context: values.context,
        link: values.link,
        updatedAt: values.updatedAt,
      },
    });

  return NextResponse.json({ saved: true });
}
