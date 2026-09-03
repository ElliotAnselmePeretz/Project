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
 * Everything below hangs off a subject the student picked, identified by its
 * group number (1–6) rather than a subject id — a student takes exactly one
 * subject per group, so the group is already a stable per-user key.
 */

/** A graded piece of work: a test, an IA draft, a mock. */
export const assessments = sqliteTable(
  "assessments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    groupNumber: integer("group_number").notNull(),
    title: text("title").notNull(),
    mark: real("mark").notNull(),
    maxMark: real("max_mark").notNull(),
    /** Weighting toward the subject average. Null counts as 1. */
    weight: real("weight"),
    takenAt: integer("taken_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [index("assessments_user_group").on(t.userId, t.groupNumber)],
);

/** The grade (1–7) a student is aiming for in one subject. */
export const subjectTargets = sqliteTable(
  "subject_targets",
  {
    userId: text("user_id").notNull(),
    groupNumber: integer("group_number").notNull(),
    targetGrade: integer("target_grade").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.groupNumber] })],
);

/** A checkable to-do for one subject. */
export const subjectGoals = sqliteTable(
  "subject_goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    groupNumber: integer("group_number").notNull(),
    text: text("text").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [index("subject_goals_user_group").on(t.userId, t.groupNumber)],
);

/** A free-text note for one subject. */
export const subjectNotes = sqliteTable(
  "subject_notes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    groupNumber: integer("group_number").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [index("subject_notes_user_group").on(t.userId, t.groupNumber)],
);

export type Assessment = typeof assessments.$inferSelect;
export type SubjectTarget = typeof subjectTargets.$inferSelect;
export type SubjectGoal = typeof subjectGoals.$inferSelect;
export type SubjectNote = typeof subjectNotes.$inferSelect;
