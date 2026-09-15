import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});

export const db = drizzle(client, { schema });

/**
 * Create tables if absent. Called lazily on first DB use so that `npm run dev`
 * works with no migration step; swap for real migrations before production.
 */
let ready: Promise<void> | null = null;
export function ensureSchema() {
  ready ??= (async () => {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        name TEXT,
        managebac_url_enc TEXT,
        last_synced_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS deadlines (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_at INTEGER NOT NULL,
        source TEXT NOT NULL,
        source_key TEXT NOT NULL,
        source_url TEXT,
        confidence REAL NOT NULL DEFAULT 1,
        dismissed INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER,
        meal_awarded INTEGER NOT NULL DEFAULT 0,
        subject TEXT,
        updated_at INTEGER DEFAULT (unixepoch())
      )`);
    // Existing databases predate these columns; SQLite has no IF NOT EXISTS for
    // ADD COLUMN, so attempt each and ignore the duplicate-column error.
    for (const col of [
      "completed_at INTEGER",
      "meal_awarded INTEGER NOT NULL DEFAULT 0",
      "subject TEXT",
    ]) {
      try {
        await client.execute(`ALTER TABLE deadlines ADD COLUMN ${col}`);
      } catch {
        /* column already present */
      }
    }
    await client.execute(`
      CREATE TABLE IF NOT EXISTS pets (
        user_id TEXT PRIMARY KEY,
        species TEXT NOT NULL,
        name TEXT NOT NULL,
        hunger REAL NOT NULL DEFAULT 100,
        xp INTEGER NOT NULL DEFAULT 0,
        meals INTEGER NOT NULL DEFAULT 0,
        last_fed_at INTEGER NOT NULL,
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS pet_meals (
        user_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        earned_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, source_type, source_id)
      )`);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS pet_meals_user_earned ON pet_meals (user_id, earned_at)`,
    );
    await client.execute(`
      CREATE TABLE IF NOT EXISTS planner_checkins (
        user_id TEXT NOT NULL,
        plan_date TEXT NOT NULL,
        available_minutes INTEGER NOT NULL,
        focus TEXT NOT NULL,
        start_time TEXT,
        daily_minutes INTEGER,
        updated_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (user_id, plan_date)
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS planner_task_state (
        user_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        difficulty TEXT NOT NULL DEFAULT 'comfortable',
        remaining_minutes INTEGER NOT NULL DEFAULT 60,
        purpose TEXT NOT NULL DEFAULT 'practise',
        purpose_confirmed INTEGER NOT NULL DEFAULT 0,
        date_confirmed INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (user_id, source_type, source_id)
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS planner_blocks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_date TEXT NOT NULL,
        position INTEGER NOT NULL,
        kind TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        task_key TEXT,
        title TEXT NOT NULL,
        subject TEXT,
        purpose TEXT,
        method TEXT,
        reason TEXT,
        urgency TEXT,
        outcome TEXT,
        actual_minutes INTEGER,
        edited INTEGER NOT NULL DEFAULT 0,
        applied_minutes INTEGER NOT NULL DEFAULT 0,
        performance TEXT
      )`);
    // Older databases predate these columns; SQLite has no IF NOT EXISTS for
    // ADD COLUMN, so try each and ignore the duplicate-column error.
    for (const [table, col] of [
      ["planner_blocks", "applied_minutes INTEGER NOT NULL DEFAULT 0"],
      ["planner_blocks", "performance TEXT"],
      ["planner_checkins", "start_time TEXT"],
      ["planner_checkins", "daily_minutes INTEGER"],
    ]) {
      try {
        await client.execute(`ALTER TABLE ${table} ADD COLUMN ${col}`);
      } catch {
        /* column already present */
      }
    }
    await client.execute(
      `CREATE INDEX IF NOT EXISTS planner_blocks_user_date ON planner_blocks (user_id, plan_date, position)`,
    );
    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS deadlines_user_source_key ON deadlines (user_id, source_key)`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS deadlines_user_due ON deadlines (user_id, due_at)`,
    );
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subject_selections (
        user_id TEXT NOT NULL,
        group_number INTEGER NOT NULL,
        subject_name TEXT NOT NULL,
        level TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (user_id, group_number)
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        group_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        mark REAL NOT NULL,
        max_mark REAL NOT NULL,
        weight REAL,
        taken_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS assessments_user_group ON assessments (user_id, group_number)`,
    );
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subject_targets (
        user_id TEXT NOT NULL,
        group_number INTEGER NOT NULL,
        target_grade INTEGER NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (user_id, group_number)
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subject_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        group_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS subject_goals_user_group ON subject_goals (user_id, group_number)`,
    );
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subject_notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        group_number INTEGER NOT NULL,
        title TEXT,
        body TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()),
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS subject_notes_user_group ON subject_notes (user_id, group_number)`,
    );
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subject_ias (
        user_id TEXT NOT NULL,
        group_number INTEGER NOT NULL,
        label TEXT,
        title TEXT,
        supervisor TEXT,
        stage TEXT,
        length_count INTEGER,
        length_limit INTEGER,
        draft_due_at INTEGER,
        final_due_at INTEGER,
        updated_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (user_id, group_number)
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ia_criteria (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        group_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        max_mark INTEGER NOT NULL,
        self_mark INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS ia_criteria_user_group ON ia_criteria (user_id, group_number)`,
    );
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ia_feedback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        group_number INTEGER NOT NULL,
        note TEXT NOT NULL,
        response TEXT,
        given_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS ia_feedback_user_group ON ia_feedback (user_id, group_number)`,
    );
    await client.execute(`
      CREATE TABLE IF NOT EXISTS extended_essays (
        user_id TEXT PRIMARY KEY,
        title TEXT,
        research_question TEXT,
        subject TEXT,
        topic TEXT,
        supervisor TEXT,
        stage TEXT,
        word_count INTEGER,
        word_limit INTEGER,
        predicted_grade TEXT,
        draft_due_at INTEGER,
        final_due_at INTEGER,
        updated_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ee_reflections (
        user_id TEXT NOT NULL,
        session_key TEXT NOT NULL,
        body TEXT,
        held_at INTEGER,
        updated_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (user_id, session_key)
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS work_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        text TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS work_goals_user_scope ON work_goals (user_id, scope)`,
    );
    await client.execute(`
      CREATE TABLE IF NOT EXISTS work_notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        title TEXT,
        body TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()),
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS work_notes_user_scope ON work_notes (user_id, scope)`,
    );
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tok_components (
        user_id TEXT NOT NULL,
        component TEXT NOT NULL,
        title TEXT,
        stage TEXT,
        word_count INTEGER,
        word_limit INTEGER,
        predicted_grade TEXT,
        draft_due_at INTEGER,
        final_due_at INTEGER,
        updated_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (user_id, component)
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tok_objects (
        user_id TEXT NOT NULL,
        slot INTEGER NOT NULL,
        name TEXT,
        context TEXT,
        link TEXT,
        updated_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (user_id, slot)
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS cas_activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        hours REAL NOT NULL DEFAULT 0,
        creativity INTEGER NOT NULL DEFAULT 0,
        activity INTEGER NOT NULL DEFAULT 0,
        service INTEGER NOT NULL DEFAULT 0,
        is_project INTEGER NOT NULL DEFAULT 0,
        happened_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS cas_activities_user ON cas_activities (user_id)`,
    );
  })();
  return ready;
}

export { schema };
