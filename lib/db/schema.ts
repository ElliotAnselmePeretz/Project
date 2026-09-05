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

/**
 * The internal assessment for one subject — at most one per subject, so the
 * group number keys it exactly as the other subject tables do.
 */
export const subjectIas = sqliteTable(
  "subject_ias",
  {
    userId: text("user_id").notNull(),
    groupNumber: integer("group_number").notNull(),
    /** "IA" or "IOA" by default, but renameable: schools differ. */
    label: text("label"),
    /** Research question for a written IA; the text or extract for an oral. */
    title: text("title"),
    supervisor: text("supervisor"),
    /** One of the stage keys in lib/ia.ts, or null before anything starts. */
    stage: text("stage"),
    /** Words for written work, minutes for an oral — see lengthUnitFor(). */
    lengthCount: integer("length_count"),
    lengthLimit: integer("length_limit"),
    draftDueAt: integer("draft_due_at", { mode: "timestamp" }),
    finalDueAt: integer("final_due_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.groupNumber] })],
);

/**
 * A marking criterion the student enters themselves, with their own honest
 * score against it. Entered rather than shipped: criteria and their mark
 * allocations differ by subject and syllabus version.
 */
export const iaCriteria = sqliteTable(
  "ia_criteria",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    groupNumber: integer("group_number").notNull(),
    name: text("name").notNull(),
    maxMark: integer("max_mark").notNull(),
    selfMark: integer("self_mark"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [index("ia_criteria_user_group").on(t.userId, t.groupNumber)],
);

/** What a supervisor said, and what the student changed because of it. */
export const iaFeedback = sqliteTable(
  "ia_feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    groupNumber: integer("group_number").notNull(),
    note: text("note").notNull(),
    response: text("response"),
    givenAt: integer("given_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [index("ia_feedback_user_group").on(t.userId, t.groupNumber)],
);

/** The extended essay — one per student, so the user id alone keys it. */
export const extendedEssays = sqliteTable("extended_essays", {
  userId: text("user_id").primaryKey(),
  title: text("title"),
  researchQuestion: text("research_question"),
  /** The subject the essay is registered in — free text, since it need not be one of the six. */
  subject: text("subject"),
  topic: text("topic"),
  supervisor: text("supervisor"),
  stage: text("stage"),
  wordCount: integer("word_count"),
  wordLimit: integer("word_limit"),
  /** A to E, unlike a subject's 1 to 7. */
  predictedGrade: text("predicted_grade"),
  draftDueAt: integer("draft_due_at", { mode: "timestamp" }),
  finalDueAt: integer("final_due_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

/**
 * The three formal reflection sessions. Fixed slots rather than a list, since
 * there are exactly three and the last one is the viva voce.
 */
export const eeReflections = sqliteTable(
  "ee_reflections",
  {
    userId: text("user_id").notNull(),
    sessionKey: text("session_key").notNull(),
    body: text("body"),
    heldAt: integer("held_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sessionKey] })],
);

/**
 * Goals and notes for the areas that are not subjects — EE, TOK, CAS — sharing
 * a scope string so a new area needs a route rather than new tables.
 */
export const workGoals = sqliteTable(
  "work_goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    scope: text("scope").notNull(),
    text: text("text").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [index("work_goals_user_scope").on(t.userId, t.scope)],
);

export const workNotes = sqliteTable(
  "work_notes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    scope: text("scope").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [index("work_notes_user_scope").on(t.userId, t.scope)],
);

/**
 * One row per TOK component — the exhibition and the essay. They are separate
 * pieces of work months apart, so each keeps its own stage, deadlines, word
 * count and predicted grade.
 */
export const tokComponents = sqliteTable(
  "tok_components",
  {
    userId: text("user_id").notNull(),
    /** "exhibition" or "essay". */
    component: text("component").notNull(),
    /** The IA prompt for the exhibition; the prescribed title for the essay. */
    title: text("title"),
    stage: text("stage"),
    wordCount: integer("word_count"),
    wordLimit: integer("word_limit"),
    /** A to E, like the extended essay. */
    predictedGrade: text("predicted_grade"),
    draftDueAt: integer("draft_due_at", { mode: "timestamp" }),
    finalDueAt: integer("final_due_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.component] })],
);

/**
 * The exhibition's three objects. Fixed numbered slots rather than a list,
 * because there are exactly three.
 */
export const tokObjects = sqliteTable(
  "tok_objects",
  {
    userId: text("user_id").notNull(),
    slot: integer("slot").notNull(),
    name: text("name"),
    /** Where the object comes from — its specific real-world context. */
    context: text("context"),
    /** How it answers the prompt. */
    link: text("link"),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.slot] })],
);

export type TokComponentRow = typeof tokComponents.$inferSelect;
export type TokObject = typeof tokObjects.$inferSelect;

export type ExtendedEssay = typeof extendedEssays.$inferSelect;
export type EeReflection = typeof eeReflections.$inferSelect;
export type WorkGoal = typeof workGoals.$inferSelect;
export type WorkNote = typeof workNotes.$inferSelect;

/**
 * One CAS experience. The three strands are separate flags rather than one
 * value, because a single activity often serves more than one — coaching a
 * team is Activity and Service.
 */
export const casActivities = sqliteTable(
  "cas_activities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    hours: real("hours").notNull().default(0),
    creativity: integer("creativity", { mode: "boolean" }).notNull().default(false),
    activity: integer("activity", { mode: "boolean" }).notNull().default(false),
    service: integer("service", { mode: "boolean" }).notNull().default(false),
    /** The CAS project, as opposed to an ordinary experience. */
    isProject: integer("is_project", { mode: "boolean" }).notNull().default(false),
    happenedAt: integer("happened_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  },
  (t) => [index("cas_activities_user").on(t.userId)],
);

export type CasActivity = typeof casActivities.$inferSelect;

export type SubjectIa = typeof subjectIas.$inferSelect;
export type IaCriterion = typeof iaCriteria.$inferSelect;
export type IaFeedbackEntry = typeof iaFeedback.$inferSelect;

export type Assessment = typeof assessments.$inferSelect;
export type SubjectTarget = typeof subjectTargets.$inferSelect;
export type SubjectGoal = typeof subjectGoals.$inferSelect;
export type SubjectNote = typeof subjectNotes.$inferSelect;
