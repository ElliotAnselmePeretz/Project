import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { validateActivity, CAS_STRANDS, type CasStrand } from "@/lib/cas";

function readBody(body: Record<string, unknown>) {
  const strands = Array.isArray(body.strands) ? (body.strands as string[]) : [];
  const input = {
    title: typeof body.title === "string" ? body.title.trim() : "",
    hours: Number(body.hours ?? 0),
    strands,
  };
  const error = validateActivity(input);
  if (error) return { error };

  const flags = Object.fromEntries(
    CAS_STRANDS.map((s) => [s, strands.includes(s)]),
  ) as Record<CasStrand, boolean>;

  let happenedAt: Date | null = null;
  if (body.happenedAt) {
    const date = new Date(body.happenedAt as string);
    if (Number.isNaN(date.getTime())) return { error: "That date could not be read" };
    happenedAt = date;
  }

  const description =
    typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
  if (description && description.length > 4000) return { error: "That description is too long" };

  return {
    values: {
      title: input.title,
      hours: input.hours,
      description,
      isProject: body.isProject === true,
      happenedAt,
      ...flags,
    },
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const activities = await db
    .select()
    .from(schema.casActivities)
    .where(eq(schema.casActivities.userId, auth.userId))
    .orderBy(desc(schema.casActivities.createdAt));

  return NextResponse.json({ activities });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const parsed = readBody(await req.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = { id: crypto.randomUUID(), userId: auth.userId, ...parsed.values };
  await db.insert(schema.casActivities).values(row);
  return NextResponse.json({ activity: row }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  if (typeof body.id !== "string") {
    return NextResponse.json({ error: "Which activity?" }, { status: 400 });
  }

  const parsed = readBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = await db
    .update(schema.casActivities)
    .set(parsed.values)
    .where(and(eq(schema.casActivities.id, body.id), eq(schema.casActivities.userId, auth.userId)));

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such activity" }, { status: 404 });
  }

  return NextResponse.json({ id: body.id });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which activity?" }, { status: 400 });

  const result = await db
    .delete(schema.casActivities)
    .where(and(eq(schema.casActivities.id, id), eq(schema.casActivities.userId, auth.userId)));

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such activity" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
