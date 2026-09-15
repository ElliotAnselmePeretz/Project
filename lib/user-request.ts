import { NextResponse, type NextRequest } from "next/server";
import { ensureSchema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";

/**
 * Signs the user in for routes that are not tied to a subject — the extended
 * essay, TOK, CAS. The subject routes use resolveSubject() instead, which also
 * checks the student actually takes the subject.
 */
export async function requireUser(
  req: NextRequest,
): Promise<{ userId: string } | { error: NextResponse }> {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) {
    return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  return { userId: token.userId };
}
