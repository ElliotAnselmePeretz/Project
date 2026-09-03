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
  })();
  return ready;
}

export { schema };
