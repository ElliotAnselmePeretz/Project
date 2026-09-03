import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Users are identified by their Entra object id (stable per person per tenant).
 * Auth sessions themselves live in an encrypted JWT cookie, so there is no
 * session table here — this stores only app data.
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // Entra `oid` claim
  email: text("email"),
  name: text("name"),
  // ManageBac iCal URL, encrypted at rest. It is a bearer secret: anyone
  // holding it can read this student's calendar.
  managebacUrlEnc: text("managebac_url_enc"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const deadlines = sqliteTable(
  "deadlines",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
    source: text("source", { enum: ["managebac", "outlook"] }).notNull(),
    /** Stable id from the source system, so re-syncing updates instead of duplicating. */
    sourceKey: text("source_key").notNull(),
    sourceUrl: text("source_url"),
    /** 1.0 for an explicit calendar date; lower when inferred from email prose. */
    confidence: real("confidence").notNull().default(1),
    dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("deadlines_user_source_key").on(t.userId, t.sourceKey),
    index("deadlines_user_due").on(t.userId, t.dueAt),
  ],
);

export type Deadline = typeof deadlines.$inferSelect;
export type NewDeadline = typeof deadlines.$inferInsert;
