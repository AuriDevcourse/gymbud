import { getDb } from "./db";
import { parseDbDate } from "./date";
import { EXERCISES_BY_ID, type MuscleGroup } from "./exercise-library";
import type {
  BodyWeightEntry,
  Profile,
  Session,
  SessionExercise,
  SetLog,
} from "./types";

// ── Profile ───────────────────────────────────────────────────────────────
interface ProfileRow {
  goal: string;
  days_per_week: number;
  equipment: string;
  unit: string;
  onboarded: number;
  updated_at: string;
}

export function getProfile(): Profile {
  const row = getDb()
    .prepare("SELECT * FROM profile WHERE id = 1")
    .get() as ProfileRow;
  return {
    goal: row.goal as Profile["goal"],
    daysPerWeek: row.days_per_week,
    equipment: safeJson(row.equipment),
    unit: row.unit as Profile["unit"],
    onboarded: Boolean(row.onboarded),
    updatedAt: row.updated_at,
  };
}

export function updateProfile(p: Partial<Profile>): Profile {
  const cur = getProfile();
  const next = { ...cur, ...p };
  getDb()
    .prepare(
      `UPDATE profile SET goal = ?, days_per_week = ?, equipment = ?, unit = ?,
       onboarded = ?, updated_at = datetime('now') WHERE id = 1`,
    )
    .run(
      next.goal,
      next.daysPerWeek,
      JSON.stringify(next.equipment),
      next.unit,
      next.onboarded ? 1 : 0,
    );
  return getProfile();
}

function safeJson(s: string): Profile["equipment"] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ── Body weight ─────────────────────────────────────────────────────────────
export function listBodyWeight(): BodyWeightEntry[] {
  const rows = getDb()
    .prepare(
      "SELECT id, weight, logged_at FROM bodyweight_log ORDER BY logged_at ASC, id ASC",
    )
    .all() as { id: number; weight: number; logged_at: string }[];
  return rows.map((r) => ({ id: r.id, weight: r.weight, loggedAt: r.logged_at }));
}

export function latestBodyWeight(): BodyWeightEntry | null {
  const r = getDb()
    .prepare(
      "SELECT id, weight, logged_at FROM bodyweight_log ORDER BY logged_at DESC, id DESC LIMIT 1",
    )
    .get() as { id: number; weight: number; logged_at: string } | undefined;
  return r ? { id: r.id, weight: r.weight, loggedAt: r.logged_at } : null;
}

export function addBodyWeight(weight: number, loggedAt: string): BodyWeightEntry {
  // one entry per day — overwrite if the day already exists
  const db = getDb();
  db.prepare("DELETE FROM bodyweight_log WHERE logged_at = ?").run(loggedAt);
  const info = db
    .prepare("INSERT INTO bodyweight_log (weight, logged_at) VALUES (?, ?)")
    .run(weight, loggedAt);
  return { id: Number(info.lastInsertRowid), weight, loggedAt };
}

// ── Sessions ────────────────────────────────────────────────────────────────
export interface SessionSummary {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  note: string | null;
  exerciseCount: number;
  setCount: number;
  volume: number;
}

export function listSessions(limit = 60): SessionSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT s.id, s.started_at, s.finished_at, s.note,
              COUNT(DISTINCT se.id) AS exercise_count,
              COUNT(sl.id)          AS set_count,
              COALESCE(SUM(sl.weight * sl.reps), 0) AS volume
       FROM session s
       LEFT JOIN session_exercise se ON se.session_id = s.id
       LEFT JOIN set_log sl          ON sl.session_exercise_id = se.id
       GROUP BY s.id
       ORDER BY s.started_at DESC
       LIMIT ?`,
    )
    .all(limit) as {
    id: number;
    started_at: string;
    finished_at: string | null;
    note: string | null;
    exercise_count: number;
    set_count: number;
    volume: number;
  }[];
  return rows.map((r) => ({
    id: r.id,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    note: r.note,
    exerciseCount: r.exercise_count,
    setCount: r.set_count,
    volume: r.volume,
  }));
}

export function activeSession(): Session | null {
  const r = getDb()
    .prepare(
      "SELECT id FROM session WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1",
    )
    .get() as { id: number } | undefined;
  return r ? getSession(r.id) : null;
}

export function getSession(id: number): Session | null {
  const db = getDb();
  const s = db
    .prepare("SELECT id, started_at, finished_at, note FROM session WHERE id = ?")
    .get(id) as
    | { id: number; started_at: string; finished_at: string | null; note: string | null }
    | undefined;
  if (!s) return null;

  const ses = db
    .prepare(
      "SELECT id, session_id, exercise_id, order_index FROM session_exercise WHERE session_id = ? ORDER BY order_index ASC, id ASC",
    )
    .all(id) as {
    id: number;
    session_id: number;
    exercise_id: string;
    order_index: number;
  }[];

  const setStmt = db.prepare(
    "SELECT id, session_exercise_id, set_index, weight, reps, type FROM set_log WHERE session_exercise_id = ? ORDER BY set_index ASC, id ASC",
  );

  const exercises: SessionExercise[] = ses.map((e) => ({
    id: e.id,
    sessionId: e.session_id,
    exerciseId: e.exercise_id,
    orderIndex: e.order_index,
    sets: (setStmt.all(e.id) as SetRow[]).map(toSet),
  }));

  return {
    id: s.id,
    startedAt: s.started_at,
    finishedAt: s.finished_at,
    note: s.note,
    exercises,
  };
}

type SetRow = {
  id: number;
  session_exercise_id: number;
  set_index: number;
  weight: number;
  reps: number;
  type: string;
};
const toSet = (r: SetRow): SetLog => ({
  id: r.id,
  sessionExerciseId: r.session_exercise_id,
  setIndex: r.set_index,
  weight: r.weight,
  reps: r.reps,
  type: (r.type as SetLog["type"]) ?? "normal",
});

export function createSession(): Session {
  const info = getDb().prepare("INSERT INTO session DEFAULT VALUES").run();
  return getSession(Number(info.lastInsertRowid))!;
}

export function finishSession(id: number, note?: string | null): Session | null {
  const db = getDb();
  if (note !== undefined) {
    db.prepare(
      "UPDATE session SET finished_at = datetime('now'), note = ? WHERE id = ?",
    ).run(note, id);
  } else {
    db.prepare(
      "UPDATE session SET finished_at = datetime('now') WHERE id = ?",
    ).run(id);
  }
  return getSession(id);
}

export function updateSessionNote(id: number, note: string | null): void {
  getDb().prepare("UPDATE session SET note = ? WHERE id = ?").run(note, id);
}

export function deleteSession(id: number): void {
  getDb().prepare("DELETE FROM session WHERE id = ?").run(id);
}

// ── Session exercises ─────────────────────────────────────────────────────
export function addExercise(sessionId: number, exerciseId: string): SessionExercise {
  const db = getDb();
  const max = db
    .prepare(
      "SELECT COALESCE(MAX(order_index), -1) AS m FROM session_exercise WHERE session_id = ?",
    )
    .get(sessionId) as { m: number };
  const info = db
    .prepare(
      "INSERT INTO session_exercise (session_id, exercise_id, order_index) VALUES (?, ?, ?)",
    )
    .run(sessionId, exerciseId, max.m + 1);
  return {
    id: Number(info.lastInsertRowid),
    sessionId,
    exerciseId,
    orderIndex: max.m + 1,
    sets: [],
  };
}

export function removeExercise(sessionExerciseId: number): void {
  getDb().prepare("DELETE FROM session_exercise WHERE id = ?").run(sessionExerciseId);
}

// Swap the movement (taken machine etc). Logged sets are cleared since the
// load won't carry over to a different exercise.
export function swapExercise(sessionExerciseId: number, newExerciseId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM set_log WHERE session_exercise_id = ?").run(
    sessionExerciseId,
  );
  db.prepare("UPDATE session_exercise SET exercise_id = ? WHERE id = ?").run(
    newExerciseId,
    sessionExerciseId,
  );
}

export function sessionExerciseOwner(sessionExerciseId: number): number | null {
  const r = getDb()
    .prepare("SELECT session_id FROM session_exercise WHERE id = ?")
    .get(sessionExerciseId) as { session_id: number } | undefined;
  return r ? r.session_id : null;
}

// ── Sets ────────────────────────────────────────────────────────────────────
export function addSet(
  sessionExerciseId: number,
  weight: number,
  reps: number,
  type: SetLog["type"] = "normal",
): SetLog {
  const db = getDb();
  const max = db
    .prepare(
      "SELECT COALESCE(MAX(set_index), -1) AS m FROM set_log WHERE session_exercise_id = ?",
    )
    .get(sessionExerciseId) as { m: number };
  const info = db
    .prepare(
      "INSERT INTO set_log (session_exercise_id, set_index, weight, reps, type) VALUES (?, ?, ?, ?, ?)",
    )
    .run(sessionExerciseId, max.m + 1, weight, reps, type);
  return {
    id: Number(info.lastInsertRowid),
    sessionExerciseId,
    setIndex: max.m + 1,
    weight,
    reps,
    type,
  };
}

export function updateSet(
  setId: number,
  weight: number,
  reps: number,
  type: SetLog["type"] = "normal",
): void {
  getDb()
    .prepare("UPDATE set_log SET weight = ?, reps = ?, type = ? WHERE id = ?")
    .run(weight, reps, type, setId);
}

export function deleteSet(setId: number): void {
  getDb().prepare("DELETE FROM set_log WHERE id = ?").run(setId);
}

// ── Coach inputs ──────────────────────────────────────────────────────────
/** Sets from the most recent time this exercise was done (before `excludeSessionId`). */
export function lastPerformance(
  exerciseId: string,
  excludeSessionId?: number,
): { sessionId: number; date: string; sets: SetLog[] } | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT se.id AS se_id, s.id AS session_id, s.started_at
       FROM session_exercise se
       JOIN session s ON s.id = se.session_id
       WHERE se.exercise_id = ? AND s.id != ?
       ORDER BY s.started_at DESC, se.id DESC
       LIMIT 1`,
    )
    .get(exerciseId, excludeSessionId ?? -1) as
    | { se_id: number; session_id: number; started_at: string }
    | undefined;
  if (!row) return null;
  const sets = (
    db
      .prepare(
        "SELECT id, session_exercise_id, set_index, weight, reps, type FROM set_log WHERE session_exercise_id = ? ORDER BY set_index ASC",
      )
      .all(row.se_id) as SetRow[]
  ).map(toSet);
  if (!sets.length) return null;
  return { sessionId: row.session_id, date: row.started_at, sets };
}

/** Per-session top set + volume for one exercise, oldest first (for charts). */
export interface ExercisePoint {
  date: string;
  topWeight: number;
  reps: number;
  volume: number;
  est1rm: number;
}
export function exerciseHistory(exerciseId: string): ExercisePoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.started_at,
              MAX(sl.weight) AS top_weight,
              SUM(sl.weight * sl.reps) AS volume
       FROM session_exercise se
       JOIN session s  ON s.id = se.session_id
       JOIN set_log sl ON sl.session_exercise_id = se.id
       WHERE se.exercise_id = ?
       GROUP BY s.id
       ORDER BY s.started_at ASC`,
    )
    .all(exerciseId) as {
    started_at: string;
    top_weight: number;
    volume: number;
  }[];

  // reps at the top weight for each session
  const repStmt = db.prepare(
    `SELECT MAX(sl.reps) AS reps
     FROM session_exercise se
     JOIN session s ON s.id = se.session_id
     JOIN set_log sl ON sl.session_exercise_id = se.id
     WHERE se.exercise_id = ? AND date(s.started_at) = date(?) AND sl.weight = ?`,
  );

  return rows.map((r) => {
    const rep = repStmt.get(exerciseId, r.started_at, r.top_weight) as {
      reps: number | null;
    };
    const reps = rep.reps ?? 0;
    return {
      date: r.started_at,
      topWeight: r.top_weight,
      reps,
      volume: r.volume,
      est1rm: Math.round(r.top_weight * (1 + reps / 30)), // Epley
    };
  });
}

/** Distinct exercise ids that have ever been logged (for the progress picker). */
export function loggedExerciseIds(): string[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT se.exercise_id AS id
       FROM session_exercise se
       JOIN set_log sl ON sl.session_exercise_id = se.id`,
    )
    .all() as { id: string }[];
  return rows.map((r) => r.id);
}

/** Days since each muscle group was last trained (for suggestions). */
export function daysSinceByMuscle(): Partial<Record<MuscleGroup, number>> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT se.exercise_id AS id, MAX(s.started_at) AS last
       FROM session_exercise se
       JOIN session s  ON s.id = se.session_id
       JOIN set_log sl ON sl.session_exercise_id = se.id
       GROUP BY se.exercise_id`,
    )
    .all() as { id: string; last: string }[];

  const now = Date.now();
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const r of rows) {
    const ex = EXERCISES_BY_ID[r.id];
    if (!ex) continue;
    const days = (now - parseDbDate(r.last).getTime()) / 86_400_000;
    for (const m of [ex.muscleGroup, ...(ex.secondary ?? [])]) {
      const prev = out[m];
      if (prev === undefined || days < prev) out[m] = days;
    }
  }
  return out;
}
