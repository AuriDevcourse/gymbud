import type { InValue, Row } from "@libsql/client";
import { getDb } from "./db";
import { parseDbDate } from "./date";
import { EXERCISES_BY_ID, type MuscleGroup } from "./exercise-library";
import {
  computeBadges,
  levelFromXp,
  xpForSession,
  type Badge,
  type LevelInfo,
} from "./levels";
import type {
  BodyWeightEntry,
  Profile,
  Run,
  Session,
  SessionExercise,
  SetLog,
  WorkoutStats,
} from "./types";

// thin helpers over the libSQL client
async function all(sql: string, args: InValue[] = []): Promise<Row[]> {
  return (await (await getDb()).execute({ sql, args })).rows;
}
async function one(sql: string, args: InValue[] = []): Promise<Row | undefined> {
  return (await all(sql, args))[0];
}
async function run(
  sql: string,
  args: InValue[] = [],
): Promise<{ lastId: number; changes: number }> {
  const r = await (await getDb()).execute({ sql, args });
  return { lastId: Number(r.lastInsertRowid ?? 0), changes: r.rowsAffected };
}

const num = (v: unknown) => Number(v);
const str = (v: unknown) => String(v);

// Epley estimated 1-rep max, guarded so a true 1-rep set IS the 1RM (no ×1.03
// inflation that could out-rank a heavier top set). One source of truth for PRs,
// top lifts and charts. SQL paths mirror this with a CASE on reps.
const epley = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));
const EPLEY_SQL = "(CASE WHEN sl.reps <= 1 THEN sl.weight ELSE sl.weight * (1 + sl.reps / 30.0) END)";

// ── Profile ───────────────────────────────────────────────────────────────
export async function getProfile(): Promise<Profile> {
  const row = (await one("SELECT * FROM profile WHERE id = 1"))!;
  return {
    name: row.name === null || row.name === undefined ? "" : str(row.name),
    goal: str(row.goal) as Profile["goal"],
    daysPerWeek: num(row.days_per_week),
    equipment: safeJson(str(row.equipment)),
    unit: str(row.unit) as Profile["unit"],
    onboarded: Boolean(num(row.onboarded)),
    updatedAt: str(row.updated_at),
  };
}

export async function updateProfile(p: Partial<Profile>): Promise<Profile> {
  const cur = await getProfile();
  const next = { ...cur, ...p };
  await run(
    `UPDATE profile SET name = ?, goal = ?, days_per_week = ?, equipment = ?, unit = ?,
     onboarded = ?, updated_at = datetime('now') WHERE id = 1`,
    [
      next.name,
      next.goal,
      next.daysPerWeek,
      JSON.stringify(next.equipment),
      next.unit,
      next.onboarded ? 1 : 0,
    ],
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
export async function listBodyWeight(): Promise<BodyWeightEntry[]> {
  const rows = await all(
    "SELECT id, weight, logged_at FROM bodyweight_log ORDER BY logged_at ASC, id ASC",
  );
  return rows.map((r) => ({ id: num(r.id), weight: num(r.weight), loggedAt: str(r.logged_at) }));
}

export async function latestBodyWeight(): Promise<BodyWeightEntry | null> {
  const r = await one(
    "SELECT id, weight, logged_at FROM bodyweight_log ORDER BY logged_at DESC, id DESC LIMIT 1",
  );
  return r ? { id: num(r.id), weight: num(r.weight), loggedAt: str(r.logged_at) } : null;
}

export async function addBodyWeight(weight: number, loggedAt: string): Promise<BodyWeightEntry> {
  await run("DELETE FROM bodyweight_log WHERE logged_at = ?", [loggedAt]);
  const { lastId } = await run(
    "INSERT INTO bodyweight_log (weight, logged_at) VALUES (?, ?)",
    [weight, loggedAt],
  );
  return { id: lastId, weight, loggedAt };
}

// ── Runs ──────────────────────────────────────────────────────────────────
export async function listRuns(limit = 60): Promise<Run[]> {
  const rows = await all(
    "SELECT id, distance, duration, kind, logged_at, note FROM run ORDER BY logged_at DESC, id DESC LIMIT ?",
    [limit],
  );
  return rows.map((r) => ({
    id: num(r.id),
    distance: num(r.distance),
    duration: num(r.duration),
    kind: str(r.kind) as Run["kind"],
    loggedAt: str(r.logged_at),
    note: r.note === null ? null : str(r.note),
  }));
}

export async function addRun(
  distance: number,
  duration: number,
  kind: Run["kind"],
  loggedAt: string,
  note: string | null,
): Promise<Run> {
  const { lastId } = await run(
    "INSERT INTO run (distance, duration, kind, logged_at, note) VALUES (?, ?, ?, ?, ?)",
    [distance, duration, kind, loggedAt, note],
  );
  return { id: lastId, distance, duration, kind, loggedAt, note };
}

export async function deleteRun(id: number): Promise<void> {
  await run("DELETE FROM run WHERE id = ?", [id]);
}

// ── Stats (streak + week volume) ──────────────────────────────────────────
function localDayKey(d: Date): string {
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

// Monday of the week a date falls in (local), as a YYYY-MM-DD key.
function weekKey(d: Date): string {
  const x = new Date(d);
  const mondayOffset = (x.getDay() + 6) % 7; // 0 = Mon
  x.setDate(x.getDate() - mondayOffset);
  return localDayKey(x);
}

export async function workoutStats(): Promise<WorkoutStats> {
  // any finished session or run counts as a "trained" day
  const sessions = await all(
    "SELECT started_at FROM session WHERE finished_at IS NOT NULL",
  );
  const runs = await all("SELECT logged_at FROM run");

  // Streak is WEEKLY (like Strava): rest days are part of training, so a missed
  // day shouldn't break it. A week counts if it has at least one workout/run.
  const weeks = new Set<string>();
  for (const s of sessions) weeks.add(weekKey(parseDbDate(str(s.started_at))));
  for (const r of runs) weeks.add(weekKey(parseDbDate(str(r.logged_at))));

  let streak = 0;
  const cursor = new Date();
  if (!weeks.has(weekKey(cursor))) cursor.setDate(cursor.getDate() - 7); // this week can still be empty
  while (weeks.has(weekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  // sets in the last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekRow = await one(
    `SELECT COUNT(sl.id) AS sets
     FROM session s
     JOIN session_exercise se ON se.session_id = s.id
     JOIN set_log sl          ON sl.session_exercise_id = se.id
     WHERE s.started_at >= ? AND COALESCE(sl.type, 'normal') != 'warmup'`,
    [weekAgo.toISOString().slice(0, 19).replace("T", " ")],
  );

  const totalRow = await one(
    "SELECT COUNT(*) AS n FROM session WHERE finished_at IS NOT NULL",
  );

  return {
    streak,
    thisWeekSets: num(weekRow?.sets ?? 0),
    totalWorkouts: num(totalRow?.n ?? 0),
  };
}

// ── Sessions ────────────────────────────────────────────────────────────────
export interface SessionSummary {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  note: string | null;
  exerciseCount: number;
  setCount: number; // working sets (warm-ups excluded) — matches XP + the finish screen
  reps: number; // working reps, for a consistent XP figure everywhere
  volume: number;
}

export async function listSessions(limit = 60): Promise<SessionSummary[]> {
  const rows = await all(
    `SELECT s.id, s.started_at, s.finished_at, s.note,
            COUNT(DISTINCT se.id) AS exercise_count,
            SUM(CASE WHEN COALESCE(sl.type, 'normal') != 'warmup' AND sl.id IS NOT NULL THEN 1 ELSE 0 END) AS set_count,
            COALESCE(SUM(CASE WHEN COALESCE(sl.type, 'normal') != 'warmup' THEN sl.reps ELSE 0 END), 0) AS reps,
            COALESCE(SUM(CASE WHEN COALESCE(sl.type, 'normal') != 'warmup' THEN sl.weight * sl.reps ELSE 0 END), 0) AS volume
     FROM session s
     LEFT JOIN session_exercise se ON se.session_id = s.id
     LEFT JOIN set_log sl          ON sl.session_exercise_id = se.id
     GROUP BY s.id
     ORDER BY s.started_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({
    id: num(r.id),
    startedAt: str(r.started_at),
    finishedAt: r.finished_at === null ? null : str(r.finished_at),
    note: r.note === null ? null : str(r.note),
    exerciseCount: num(r.exercise_count),
    setCount: num(r.set_count),
    reps: num(r.reps),
    volume: num(r.volume),
  }));
}

// An open session left running for this long with no logged sets is treated as
// abandoned — its timer would otherwise count up forever and it blocks starting
// a fresh workout. A real gym session never runs this long.
const ABANDON_AFTER_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function activeSession(): Promise<Session | null> {
  const r = await one(
    "SELECT id FROM session WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1",
  );
  if (!r) return null;
  const s = await getSession(num(r.id));
  if (!s) return null;

  // Self-heal a phantom: an old open session with nothing logged is abandoned,
  // so drop it. Never touches a session that has real sets in it.
  const loggedSets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
  const ageMs = Date.now() - parseDbDate(s.startedAt).getTime();
  if (loggedSets === 0 && ageMs > ABANDON_AFTER_MS) {
    await deleteSession(s.id);
    return null;
  }
  return s;
}

export async function getSession(id: number): Promise<Session | null> {
  const s = await one(
    "SELECT id, started_at, finished_at, note FROM session WHERE id = ?",
    [id],
  );
  if (!s) return null;

  const ses = await all(
    "SELECT id, session_id, exercise_id, order_index, difficulty FROM session_exercise WHERE session_id = ? ORDER BY order_index ASC, id ASC",
    [id],
  );

  const exercises: SessionExercise[] = [];
  for (const e of ses) {
    const seId = num(e.id);
    const setRows = await all(
      "SELECT id, session_exercise_id, set_index, weight, reps, type FROM set_log WHERE session_exercise_id = ? ORDER BY set_index ASC, id ASC",
      [seId],
    );
    exercises.push({
      id: seId,
      sessionId: num(e.session_id),
      exerciseId: str(e.exercise_id),
      orderIndex: num(e.order_index),
      difficulty: e.difficulty === null ? null : (str(e.difficulty) as SessionExercise["difficulty"]),
      sets: setRows.map(toSet),
    });
  }

  return {
    id: num(s.id),
    startedAt: str(s.started_at),
    finishedAt: s.finished_at === null ? null : str(s.finished_at),
    note: s.note === null ? null : str(s.note),
    exercises,
  };
}

const toSet = (r: Row): SetLog => ({
  id: num(r.id),
  sessionExerciseId: num(r.session_exercise_id),
  setIndex: num(r.set_index),
  weight: num(r.weight),
  reps: num(r.reps),
  type: (str(r.type) as SetLog["type"]) ?? "normal",
});

export async function createSession(): Promise<Session> {
  const { lastId } = await run("INSERT INTO session DEFAULT VALUES");
  return (await getSession(lastId))!;
}

export async function finishSession(
  id: number,
  note?: string | null,
): Promise<Session | null> {
  if (note !== undefined) {
    await run("UPDATE session SET finished_at = datetime('now'), note = ? WHERE id = ?", [
      note,
      id,
    ]);
  } else {
    await run("UPDATE session SET finished_at = datetime('now') WHERE id = ?", [id]);
  }
  return getSession(id);
}

export async function updateSessionNote(id: number, note: string | null): Promise<void> {
  await run("UPDATE session SET note = ? WHERE id = ?", [note, id]);
}

export async function deleteSession(id: number): Promise<void> {
  await run("DELETE FROM session WHERE id = ?", [id]);
}

// ── Session exercises ─────────────────────────────────────────────────────
export async function addExercise(
  sessionId: number,
  exerciseId: string,
): Promise<SessionExercise> {
  const max = await one(
    "SELECT COALESCE(MAX(order_index), -1) AS m FROM session_exercise WHERE session_id = ?",
    [sessionId],
  );
  const orderIndex = num(max!.m) + 1;
  const { lastId } = await run(
    "INSERT INTO session_exercise (session_id, exercise_id, order_index) VALUES (?, ?, ?)",
    [sessionId, exerciseId, orderIndex],
  );
  return { id: lastId, sessionId, exerciseId, orderIndex, difficulty: null, sets: [] };
}

export async function setDifficulty(
  sessionExerciseId: number,
  difficulty: SessionExercise["difficulty"],
): Promise<void> {
  await run("UPDATE session_exercise SET difficulty = ? WHERE id = ?", [
    difficulty,
    sessionExerciseId,
  ]);
}

export async function removeExercise(sessionExerciseId: number): Promise<void> {
  await run("DELETE FROM session_exercise WHERE id = ?", [sessionExerciseId]);
}

// Swap the movement. Logged sets are cleared since the load won't carry over.
export async function swapExercise(
  sessionExerciseId: number,
  newExerciseId: string,
): Promise<void> {
  await run("DELETE FROM set_log WHERE session_exercise_id = ?", [sessionExerciseId]);
  await run("UPDATE session_exercise SET exercise_id = ? WHERE id = ?", [
    newExerciseId,
    sessionExerciseId,
  ]);
}

export async function sessionExerciseOwner(
  sessionExerciseId: number,
): Promise<number | null> {
  const r = await one("SELECT session_id FROM session_exercise WHERE id = ?", [
    sessionExerciseId,
  ]);
  return r ? num(r.session_id) : null;
}

// ── Sets ────────────────────────────────────────────────────────────────────
export async function addSet(
  sessionExerciseId: number,
  weight: number,
  reps: number,
  type: SetLog["type"] = "normal",
): Promise<SetLog> {
  const max = await one(
    "SELECT COALESCE(MAX(set_index), -1) AS m FROM set_log WHERE session_exercise_id = ?",
    [sessionExerciseId],
  );
  const setIndex = num(max!.m) + 1;
  const { lastId } = await run(
    "INSERT INTO set_log (session_exercise_id, set_index, weight, reps, type) VALUES (?, ?, ?, ?, ?)",
    [sessionExerciseId, setIndex, weight, reps, type],
  );
  return { id: lastId, sessionExerciseId, setIndex, weight, reps, type };
}

// Edit a logged set in place (fix a mistyped weight/reps/type).
export async function updateSet(
  setId: number,
  weight: number,
  reps: number,
  type: SetLog["type"],
): Promise<SetLog | null> {
  await run(
    "UPDATE set_log SET weight = ?, reps = ?, type = ? WHERE id = ?",
    [weight, reps, type, setId],
  );
  const r = await one(
    "SELECT id, session_exercise_id, set_index, weight, reps, type FROM set_log WHERE id = ?",
    [setId],
  );
  return r ? toSet(r) : null;
}

export async function setOwner(setId: number): Promise<number | null> {
  const r = await one(
    `SELECT se.session_id AS sid
     FROM set_log sl JOIN session_exercise se ON se.id = sl.session_exercise_id
     WHERE sl.id = ?`,
    [setId],
  );
  return r ? num(r.sid) : null;
}

export async function deleteSet(setId: number): Promise<void> {
  await run("DELETE FROM set_log WHERE id = ?", [setId]);
}

// ── Coach inputs ──────────────────────────────────────────────────────────
export async function lastPerformance(
  exerciseId: string,
  excludeSessionId?: number,
): Promise<{
  sessionId: number;
  date: string;
  sets: SetLog[];
  difficulty: SessionExercise["difficulty"];
} | null> {
  const row = await one(
    `SELECT se.id AS se_id, se.difficulty AS difficulty, s.id AS session_id, s.started_at
     FROM session_exercise se
     JOIN session s ON s.id = se.session_id
     WHERE se.exercise_id = ? AND s.id != ?
     ORDER BY s.started_at DESC, se.id DESC
     LIMIT 1`,
    [exerciseId, excludeSessionId ?? -1],
  );
  if (!row) return null;
  const sets = (
    await all(
      "SELECT id, session_exercise_id, set_index, weight, reps, type FROM set_log WHERE session_exercise_id = ? ORDER BY set_index ASC",
      [num(row.se_id)],
    )
  ).map(toSet);
  if (!sets.length) return null;
  return {
    sessionId: num(row.session_id),
    date: str(row.started_at),
    sets,
    difficulty: row.difficulty === null ? null : (str(row.difficulty) as SessionExercise["difficulty"]),
  };
}

// A set is a PR if its estimated 1RM beats the best from any OTHER time we've
// done this exercise (so there must be prior history to beat).
export async function isSetPR(
  sessionExerciseId: number,
  weight: number,
  reps: number,
): Promise<boolean> {
  if (weight <= 0) return false;
  const row = await one(
    `SELECT MAX(${EPLEY_SQL}) AS best
     FROM set_log sl
     JOIN session_exercise se ON se.id = sl.session_exercise_id
     WHERE se.exercise_id = (SELECT exercise_id FROM session_exercise WHERE id = ?)
       AND sl.session_exercise_id != ?
       AND COALESCE(sl.type, 'normal') != 'warmup'`,
    [sessionExerciseId, sessionExerciseId],
  );
  const best = row && row.best !== null ? num(row.best) : 0;
  if (best <= 0) return false; // no prior history to beat
  return epley(weight, reps) > best;
}

export interface ExercisePoint {
  date: string;
  topWeight: number;
  reps: number;
  volume: number;
  est1rm: number;
}
export async function exerciseHistory(exerciseId: string): Promise<ExercisePoint[]> {
  const rows = await all(
    `SELECT s.started_at,
            MAX(sl.weight) AS top_weight,
            SUM(sl.weight * sl.reps) AS volume
     FROM session_exercise se
     JOIN session s  ON s.id = se.session_id
     JOIN set_log sl ON sl.session_exercise_id = se.id
     WHERE se.exercise_id = ?
     GROUP BY s.id
     ORDER BY s.started_at ASC`,
    [exerciseId],
  );

  const points: ExercisePoint[] = [];
  for (const r of rows) {
    const topWeight = num(r.top_weight);
    const rep = await one(
      `SELECT MAX(sl.reps) AS reps
       FROM session_exercise se
       JOIN session s ON s.id = se.session_id
       JOIN set_log sl ON sl.session_exercise_id = se.id
       WHERE se.exercise_id = ? AND date(s.started_at) = date(?) AND sl.weight = ?`,
      [exerciseId, str(r.started_at), topWeight],
    );
    const reps = rep && rep.reps !== null ? num(rep.reps) : 0;
    points.push({
      date: str(r.started_at),
      topWeight,
      reps,
      volume: num(r.volume),
      est1rm: Math.round(epley(topWeight, reps)),
    });
  }
  return points;
}

// Best lift per exercise, ranked — a real "how strong am I" view across the
// whole library instead of one hand-picked exercise. est-1RM via Epley.
export interface TopLift {
  exerciseId: string;
  name: string;
  weight: number;
  reps: number;
  est1rm: number;
}

export async function topLifts(limit = 6): Promise<TopLift[]> {
  const rows = await all(
    `SELECT se.exercise_id AS id, sl.weight AS weight, sl.reps AS reps,
            ${EPLEY_SQL} AS e1rm
     FROM session_exercise se
     JOIN set_log sl ON sl.session_exercise_id = se.id
     WHERE COALESCE(sl.type, 'normal') != 'warmup' AND sl.weight > 0`,
  );
  // best set (by est-1RM) per exercise
  const best = new Map<string, { weight: number; reps: number; e1rm: number }>();
  for (const r of rows) {
    const id = str(r.id);
    const e1rm = num(r.e1rm);
    const prev = best.get(id);
    if (!prev || e1rm > prev.e1rm) best.set(id, { weight: num(r.weight), reps: num(r.reps), e1rm });
  }
  return [...best.entries()]
    .map(([id, b]) => ({
      exerciseId: id,
      name: EXERCISES_BY_ID[id]?.name ?? id,
      weight: b.weight,
      reps: b.reps,
      est1rm: Math.round(b.e1rm),
    }))
    .sort((a, b) => b.est1rm - a.est1rm)
    .slice(0, limit);
}

export async function loggedExerciseIds(): Promise<string[]> {
  const rows = await all(
    `SELECT DISTINCT se.exercise_id AS id
     FROM session_exercise se
     JOIN set_log sl ON sl.session_exercise_id = se.id`,
  );
  return rows.map((r) => str(r.id));
}

export async function daysSinceByMuscle(): Promise<Partial<Record<MuscleGroup, number>>> {
  const rows = await all(
    `SELECT se.exercise_id AS id, MAX(s.started_at) AS last
     FROM session_exercise se
     JOIN session s  ON s.id = se.session_id
     JOIN set_log sl ON sl.session_exercise_id = se.id
     GROUP BY se.exercise_id`,
  );

  const now = Date.now();
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const r of rows) {
    const ex = EXERCISES_BY_ID[str(r.id)];
    if (!ex) continue;
    const days = (now - parseDbDate(str(r.last)).getTime()) / 86_400_000;
    for (const m of [ex.muscleGroup, ...(ex.secondary ?? [])]) {
      const prev = out[m];
      if (prev === undefined || days < prev) out[m] = days;
    }
  }
  return out;
}

// ── Progress summary: XP, level, badges (all derived from history) ────────────
export interface ProgressSummary {
  totalXp: number;
  level: LevelInfo;
  streak: number;
  totalWorkouts: number;
  thisWeekSets: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  distinctExercises: number;
  distinctMuscles: number;
  badges: Badge[];
}

export async function progressSummary(): Promise<ProgressSummary> {
  const stats = await workoutStats();

  // lifetime work — working sets only (warm-ups don't earn XP)
  const agg = await one(
    `SELECT COUNT(sl.id) AS sets,
            COALESCE(SUM(sl.reps), 0) AS reps,
            COALESCE(SUM(sl.weight * sl.reps), 0) AS volume
     FROM set_log sl
     WHERE COALESCE(sl.type, 'normal') != 'warmup'`,
  );
  const totalSets = num(agg?.sets ?? 0);
  const totalReps = num(agg?.reps ?? 0);
  const totalVolume = num(agg?.volume ?? 0);

  const exIds = await loggedExerciseIds();
  const muscles = new Set<MuscleGroup>();
  for (const id of exIds) {
    const ex = EXERCISES_BY_ID[id];
    if (ex) muscles.add(ex.muscleGroup);
  }

  const totalXp = xpForSession({ workingSets: totalSets, reps: totalReps, finished: false }) +
    stats.totalWorkouts * 50;
  const level = levelFromXp(totalXp);

  const badges = computeBadges({
    totalWorkouts: stats.totalWorkouts,
    streak: stats.streak,
    totalSets,
    totalVolume,
    distinctExercises: exIds.length,
    distinctMuscles: muscles.size,
    level: level.level,
  });

  return {
    totalXp,
    level,
    streak: stats.streak,
    totalWorkouts: stats.totalWorkouts,
    thisWeekSets: stats.thisWeekSets,
    totalSets,
    totalReps,
    totalVolume,
    distinctExercises: exIds.length,
    distinctMuscles: muscles.size,
    badges,
  };
}
