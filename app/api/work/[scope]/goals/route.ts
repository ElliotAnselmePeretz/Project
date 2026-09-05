import { NextResponse, type NextRequest } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";
import { isValidScope } from "@/lib/work";
import { validateText } from "@/lib/subject-manager";

type Params = { params: Promise<{ scope: string }> };

const MAX_LENGTH = 200;

/** Signs the user in and checks the scope in the URL is one we serve. */
async function resolve(req: NextRequest, params: Params["params"]) {
  const { scope } = await params;
  if (!isValidScope(scope)) {
    return { error: NextResponse.json({ error: "Unknown area" }, { status: 404 }) };
  }
  const auth = await requireUser(req);
  if ("error" in auth) return { error: auth.error };
  return { userId: auth.userId, scope };
}

export async function GET(req: NextRequest, { params }: Params) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;

  const goals = await db
    .select()
    .from(schema.workGoals)
    .where(and(eq(schema.workGoals.userId, r.userId), eq(schema.workGoals.scope, r.scope)))
    .orderBy(asc(schema.workGoals.done), desc(schema.workGoals.createdAt));

  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest, { params }: Params) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;

  const body = await req.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";

  const error = validateText(text, "Goal", MAX_LENGTH);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const row = { id: crypto.randomUUID(), userId: r.userId, scope: r.scope, text, done: false };
  await db.insert(schema.workGoals).values(row);
  return NextResponse.json({ goal: row }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;

  const { id, done } = await req.json();
  if (typeof id !== "string" || typeof done !== "boolean") {
    return NextResponse.json({ error: "Need a goal id and a done flag" }, { status: 400 });
  }

  const result = await db
    .update(schema.workGoals)
    .set({ done })
    .where(
      and(
        eq(schema.workGoals.id, id),
        eq(schema.workGoals.userId, r.userId),
        eq(schema.workGoals.scope, r.scope),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such goal" }, { status: 404 });
  }

  return NextResponse.json({ id, done });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which goal?" }, { status: 400 });

  const result = await db
    .delete(schema.workGoals)
    .where(
      and(
        eq(schema.workGoals.id, id),
        eq(schema.workGoals.userId, r.userId),
        eq(schema.workGoals.scope, r.scope),
      ),
    );

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No such goal" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
