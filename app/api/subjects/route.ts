import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";
import { validateSelections, type SubjectSelectionInput } from "@/lib/ib-subjects";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rows = await db
    .select()
    .from(schema.subjectSelections)
    .where(eq(schema.subjectSelections.userId, token.userId));

  return NextResponse.json({ subjects: rows });
}

export async function PUT(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { subjects } = await req.json();
  if (!Array.isArray(subjects)) {
    return NextResponse.json({ error: "Expected a list of subjects" }, { status: 400 });
  }

  const error = validateSelections(subjects as SubjectSelectionInput[]);
  if (error) return NextResponse.json({ error }, { status: 400 });

  await db.delete(schema.subjectSelections).where(eq(schema.subjectSelections.userId, token.userId));
  await db.insert(schema.subjectSelections).values(
    (subjects as SubjectSelectionInput[]).map((s) => ({
      userId: token.userId!,
      groupNumber: s.groupNumber,
      subjectName: s.subjectName,
      level: s.level as "HL" | "SL",
    })),
  );

  return NextResponse.json({ saved: true });
}
