import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/lib/db";
import { getGraphToken } from "@/lib/graph-token";
import { streakFrom, daysBetween } from "@/lib/deadline-utils";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const token = await getGraphToken(req);
  if (!token?.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const done = await db
    .select({ completedAt: schema.deadlines.completedAt })
    .from(schema.deadlines)
    .where(and(eq(schema.deadlines.userId, token.userId), isNotNull(schema.deadlines.completedAt)));

  const dates = done.map((r) => r.completedAt!).filter(Boolean);
  const now = new Date();

  const open = await db
    .select({ dueAt: schema.deadlines.dueAt })
    .from(schema.deadlines)
    .where(and(eq(schema.deadlines.userId, token.userId), eq(schema.deadlines.dismissed, false)));

  return NextResponse.json({
    streak: streakFrom(dates, now),
    completedTotal: dates.length,
    completedThisWeek: dates.filter((d) => daysBetween(d, now) < 7).length,
    openCount: open.length,
    overdueCount: open.filter((d) => daysBetween(now, d.dueAt) < 0).length,
  });
}
