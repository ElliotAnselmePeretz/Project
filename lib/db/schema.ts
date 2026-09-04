import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";

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

/** One row per IB subject group (1–6) a student has picked a subject for. */
export const subjectSelections = sqliteTable(
  "subject_selections",
  {
    userId: text("user_id").notNull(),
    groupNumber: integer("group_number").notNull(),
    subjectName: text("subject_name").notNull(),
    level: text("level", { enum: ["HL", "SL"] }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.groupNumber] })],
);

export type SubjectSelection = typeof subjectSelections.$inferSelect;
export type NewSubjectSelection = typeof subjectSelections.$inferInsert;

/**
 * One pet per user. `meals` is the earned currency: completing a deadline adds
 * one, feeding spends one. `hunger` is the value at `lastFedAt` — the live
 * figure is derived from elapsed time by lib/pets.ts, so a pet gets hungry
 * whether or not anyone opens the page.
 */
export const pets = sqliteTable("pets", {
  userId: text("user_id").primaryKey(),
  species: text("species", {
    enum: ["nimbus", "sprout", "ember", "pebble", "ripple", "moth", "star", "blot"],
  }).notNull(),
  name: text("name").notNull(),
  hunger: real("hunger").notNull().default(100),
  xp: integer("xp").notNull().default(0),
  meals: integer("meals").notNull().default(0),
  lastFedAt: integer("last_fed_at", { mode: "timestamp" }).notNull(),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export type Pet = typeof pets.$inferSelect;
export type NewPet = typeof pets.$inferInsert;
