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
        updated_at INTEGER DEFAULT (unixepoch())
      )`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS planner_checkins (
        user_id TEXT NOT NULL,
        plan_date TEXT NOT NULL,
        available_minutes INTEGER NOT NULL,
        focus TEXT NOT NULL,
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
        edited INTEGER NOT NULL DEFAULT 0
      )`);
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
  })();
  return ready;
}

export { schema };
