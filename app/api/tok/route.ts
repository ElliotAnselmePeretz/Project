import { NextResponse, type NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/user-request";

/** Both components and the three objects, in one request. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const [components, objects] = await Promise.all([
    db.select().from(schema.tokComponents).where(eq(schema.tokComponents.userId, auth.userId)),
    db
      .select()
      .from(schema.tokObjects)
      .where(eq(schema.tokObjects.userId, auth.userId))
      .orderBy(asc(schema.tokObjects.slot)),
  ]);

  return NextResponse.json({ components, objects });
}
