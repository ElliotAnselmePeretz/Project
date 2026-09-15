import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";
import { isValidGroup } from "@/lib/subject-manager";

export interface SubjectContext {
  userId: string;
  groupNumber: number;
  selection: typeof schema.subjectSelections.$inferSelect;
}

/**
 * Every subject route starts here: it signs the user in, checks the group is
 * real, and — importantly — checks the student actually takes a subject in it.
 * That last check is what scopes all subject data to its owner, so no route
 * needs to think about it again.
 *
 * Returns either a usable context or the response to send back instead.
 */
export async function resolveSubject(
  req: NextRequest,
  groupParam: string,
): Promise<{ ctx: SubjectContext } | { error: NextResponse }> {
  await ensureSchema();

  const token = await getGraphToken(req);
  if (!token?.userId) {
    return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }

  const groupNumber = Number(groupParam);
  if (!isValidGroup(groupNumber)) {
    return { error: NextResponse.json({ error: "No such subject group" }, { status: 404 }) };
  }

  const [selection] = await db
    .select()
    .from(schema.subjectSelections)
    .where(
      and(
        eq(schema.subjectSelections.userId, token.userId),
        eq(schema.subjectSelections.groupNumber, groupNumber),
      ),
    );

  if (!selection) {
    return {
      error: NextResponse.json(
        { error: "You have not picked a subject for this group yet" },
        { status: 404 },
      ),
    };
  }

  return { ctx: { userId: token.userId, groupNumber, selection } };
}
