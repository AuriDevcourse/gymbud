import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";

// libSQL client. Locally it uses a file (file:./data/gym.db) so dev works
// offline with no account; on Vercel it points at Turso (set via env). Same
// SQLite dialect either way, so the queries don't change.
const g = globalThis as unknown as {
  __gymDb?: Client;
  __gymReady?: Promise<void>;
};

function client(): Client {
  if (g.__gymDb) return g.__gymDb;
  const url = process.env.TURSO_DATABASE_URL || "file:./data/gym.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url.startsWith("file:")) mkdirSync("data", { recursive: true });
  g.__gymDb = createClient(authToken ? { url, authToken } : { url });
  return g.__gymDb;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS profile (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    name         TEXT    NOT NULL DEFAULT '',
    goal         TEXT    NOT NULL DEFAULT 'general',
    days_per_week INTEGER NOT NULL DEFAULT 3,
    equipment    TEXT    NOT NULL DEFAULT '[]',
    unit         TEXT    NOT NULL DEFAULT 'kg',
    onboarded    INTEGER NOT NULL DEFAULT 0,
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS run (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    distance   REAL NOT NULL,            -- kilometres
    duration   INTEGER NOT NULL,         -- seconds
    kind       TEXT NOT NULL DEFAULT 'long', -- long | short | interval
    logged_at  TEXT NOT NULL,            -- YYYY-MM-DD
    note       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_run_logged_at ON run(logged_at);

  CREATE TABLE IF NOT EXISTS bodyweight_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    weight    REAL NOT NULL,
    logged_at TEXT NOT NULL,
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
    order_index INTEGER NOT NULL DEFAULT 0,
    difficulty  TEXT          -- easy | right | hard (RPE), set at finish
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

  CREATE TABLE IF NOT EXISTS strava_auth (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    access_token  TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at    INTEGER NOT NULL,      -- epoch seconds
    athlete       TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS demo_cache (
    exercise_id  TEXT PRIMARY KEY,
    name         TEXT,
    frames       INTEGER NOT NULL DEFAULT 0,
    instructions TEXT NOT NULL DEFAULT '[]',
    images       TEXT NOT NULL DEFAULT '[]',
    missing      INTEGER NOT NULL DEFAULT 0
  );

  INSERT OR IGNORE INTO profile (id) VALUES (1);
`;

// Bump when the demo-matching algorithm changes, to drop stale (wrong) matches.
const DEMO_MATCH_VERSION = "7"; // 7: curated alias map for ~20 previously demo-less lifts

async function migrate(c: Client): Promise<void> {
  await c.executeMultiple(SCHEMA);
  // forward-compat for databases created before these columns existed
  for (const sql of [
    "ALTER TABLE profile ADD COLUMN onboarded INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE profile ADD COLUMN name TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE set_log ADD COLUMN type TEXT NOT NULL DEFAULT 'normal'",
    "ALTER TABLE run ADD COLUMN kind TEXT NOT NULL DEFAULT 'long'",
    "ALTER TABLE run ADD COLUMN session_id INTEGER", // cardio done as part of a workout
    "ALTER TABLE run ADD COLUMN strava_id TEXT", // Strava activity id (import dedupe)
    "ALTER TABLE session_exercise ADD COLUMN difficulty TEXT",
    "ALTER TABLE set_log ADD COLUMN client_key TEXT", // idempotency key for retried set POSTs
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_run_strava ON run(strava_id) WHERE strava_id IS NOT NULL",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_set_client_key ON set_log(client_key) WHERE client_key IS NOT NULL",
  ]) {
    try {
      await c.execute(sql);
    } catch {
      /* column already exists */
    }
  }

  // Clear cached demo matches once whenever the matching logic changes.
  try {
    const marker = (
      await c.execute({
        sql: "SELECT name FROM demo_cache WHERE exercise_id = '__match_version__'",
      })
    ).rows[0];
    if (!marker || String(marker.name) !== DEMO_MATCH_VERSION) {
      await c.execute("DELETE FROM demo_cache");
      await c.execute({
        sql: "INSERT INTO demo_cache (exercise_id, name, missing) VALUES ('__match_version__', ?, 1)",
        args: [DEMO_MATCH_VERSION],
      });
    }
  } catch {
    /* non-critical: demos just re-match on next request */
  }
}

export async function getDb(): Promise<Client> {
  const c = client();
  if (!g.__gymReady) g.__gymReady = migrate(c);
  await g.__gymReady;
  return c;
}
