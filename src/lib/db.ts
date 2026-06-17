import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Cache the connection on globalThis so Turbopack HMR doesn't open a new
// handle on every module re-evaluation in dev.
const g = globalThis as unknown as { __gymDb?: Database.Database };

function create(): Database.Database {
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "gym.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id           INTEGER PRIMARY KEY CHECK (id = 1),
      goal         TEXT    NOT NULL DEFAULT 'general',
      days_per_week INTEGER NOT NULL DEFAULT 3,
      equipment    TEXT    NOT NULL DEFAULT '[]',
      unit         TEXT    NOT NULL DEFAULT 'kg',
      onboarded    INTEGER NOT NULL DEFAULT 0,
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bodyweight_log (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      weight    REAL NOT NULL,
      logged_at TEXT NOT NULL,            -- YYYY-MM-DD
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_bw_logged_at ON bodyweight_log(logged_at);

    CREATE TABLE IF NOT EXISTS session (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at  TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      note        TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_session_started ON session(started_at);

    CREATE TABLE IF NOT EXISTS session_exercise (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_se_session ON session_exercise(session_id);
    CREATE INDEX IF NOT EXISTS idx_se_exercise ON session_exercise(exercise_id);

    CREATE TABLE IF NOT EXISTS set_log (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      session_exercise_id INTEGER NOT NULL REFERENCES session_exercise(id) ON DELETE CASCADE,
      set_index           INTEGER NOT NULL DEFAULT 0,
      weight              REAL NOT NULL,
      reps                INTEGER NOT NULL,
      type                TEXT NOT NULL DEFAULT 'normal',
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_set_se ON set_log(session_exercise_id);

    -- single profile row
    INSERT OR IGNORE INTO profile (id) VALUES (1);
  `);

  // Forward-compat: add columns on databases created before these features.
  try {
    db.exec("ALTER TABLE profile ADD COLUMN onboarded INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE set_log ADD COLUMN type TEXT NOT NULL DEFAULT 'normal'");
  } catch {
    /* column already exists */
  }
}

export function getDb(): Database.Database {
  if (!g.__gymDb) g.__gymDb = create();
  return g.__gymDb;
}
