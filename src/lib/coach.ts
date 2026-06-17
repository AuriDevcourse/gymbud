import {
  EXERCISES,
  EXERCISES_BY_ID,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from "./exercise-library";
import { REP_RANGE, type Goal, type Recommendation, type Unit } from "./types";

type SetInput = { weight: number; reps: number };

// Smallest sensible plate jump per unit.
export function increment(unit: Unit): number {
  return unit === "kg" ? 2.5 : 5;
}

// The heaviest set; ties broken by most reps. Used as the "working" set.
export function topSet(sets: SetInput[]): SetInput | null {
  if (!sets.length) return null;
  return [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
}

/**
 * The core coach: given how THIS session went (and last time), say what to do
 * next session for one exercise — push harder, hold, or back off.
 */
export function recommendNext(
  thisSets: SetInput[],
  lastSets: SetInput[],
  goal: Goal,
  unit: Unit,
): Recommendation {
  const cur = topSet(thisSets);
  const last = topSet(lastSets);

  if (!cur) {
    return {
      action: "start",
      reason: "Log a few sets and the coach will tell you what to do next time.",
      suggestedWeight: last?.weight ?? null,
      lastTopSet: last,
    };
  }

  const range = REP_RANGE[goal];
  const step = increment(unit);
  const u = unit;

  // Hit the top of the rep range on the heaviest set -> add weight next time.
  if (cur.reps >= range.high) {
    return {
      action: "increase",
      reason: `You got ${cur.reps} reps at ${cur.weight}${u}, the top of your range. Add weight next session.`,
      suggestedWeight: round(cur.weight + step, u),
      lastTopSet: last,
    };
  }

  // Below the bottom of the range -> too heavy, ease off and rebuild.
  if (cur.reps < range.low) {
    return {
      action: "back_off",
      reason: `Only ${cur.reps} reps at ${cur.weight}${u}, below your ${range.low}-rep target. Drop a touch and own the form.`,
      suggestedWeight: round(Math.max(0, cur.weight - step), u),
      lastTopSet: last,
    };
  }

  // In range -> hold the weight and chase more reps.
  let reason = `Solid: ${cur.reps} reps at ${cur.weight}${u}. Stay here and push for ${range.high} reps before adding weight.`;
  if (last && cur.weight > last.weight) {
    reason = `Up to ${cur.weight}${u} from ${last.weight}${u}. Hold it and build to ${range.high} reps.`;
  } else if (last && cur.reps > last.reps && cur.weight === last.weight) {
    reason = `${cur.reps} reps, up from ${last.reps} last time. Keep climbing toward ${range.high}.`;
  }
  return {
    action: "maintain",
    reason,
    suggestedWeight: round(cur.weight, u),
    lastTopSet: last,
  };
}

function round(w: number, unit: Unit): number {
  const step = unit === "kg" ? 0.5 : 1;
  return Math.round(w / step) * step;
}

// ── Substitution ────────────────────────────────────────────────────────
function isAvailable(ex: Exercise, available: Equipment[]): boolean {
  if (!available.length) return true; // no preference set = everything available
  if (ex.equipment === "bodyweight") return true;
  return available.includes(ex.equipment);
}

/**
 * "The machine is taken" — return swaps that hit the SAME muscle with
 * different equipment. Never returns an empty list (falls back to any
 * same-muscle option) so there's no dead end.
 */
export function getAlternatives(
  exerciseId: string,
  opts: { available?: Equipment[]; excludeEquipment?: Equipment } = {},
): Exercise[] {
  const base = EXERCISES_BY_ID[exerciseId];
  if (!base) return [];
  const available = opts.available ?? [];
  const taken = opts.excludeEquipment ?? base.equipment;

  const score = (ex: Exercise): number => {
    let s = 0;
    if (ex.equipment !== taken) s += 4; // different equipment is the whole point
    if (isAvailable(ex, available)) s += 2;
    if (ex.type === base.type) s += 1; // keep compound-for-compound when possible
    return s;
  };

  // 1) curated alternatives
  const curated = base.alternatives
    .map((id) => EXERCISES_BY_ID[id])
    .filter(Boolean) as Exercise[];

  // 2) fallback: any other exercise for the same primary muscle
  const sameMuscle = EXERCISES.filter(
    (e) => e.muscleGroup === base.muscleGroup && e.id !== base.id,
  );

  const seen = new Set<string>();
  const pool = [...curated, ...sameMuscle].filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return pool.sort((a, b) => score(b) - score(a));
}

// ── Workout suggestion ────────────────────────────────────────────────────
const BUCKETS: Record<"push" | "pull" | "legs", MuscleGroup[]> = {
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps", "forearms"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
};

export interface Suggestion {
  title: string;
  focus: MuscleGroup[];
  exercises: Exercise[];
}

/**
 * Suggest today's session from the goal, weekly frequency and which muscles
 * were trained recently. Stale muscles get priority; compounds come first.
 */
export function suggestWorkout(opts: {
  goal: Goal;
  daysPerWeek: number;
  available?: Equipment[];
  daysSince: Partial<Record<MuscleGroup, number>>; // days since each muscle trained
}): Suggestion {
  const available = opts.available ?? [];
  const staleness = (m: MuscleGroup) => opts.daysSince[m] ?? 999;
  const bucketStale = (b: keyof typeof BUCKETS) =>
    BUCKETS[b].reduce((sum, m) => sum + staleness(m), 0) / BUCKETS[b].length;

  let title: string;
  let focus: MuscleGroup[];

  if (opts.daysPerWeek <= 3) {
    // Full-body: one compound from each region + accessories for the stalest.
    title = "Full Body";
    focus = ["quads", "back", "chest", "shoulders", "hamstrings", "core"];
  } else if (opts.daysPerWeek === 4) {
    const upper = (bucketStale("push") + bucketStale("pull")) / 2;
    const lower = bucketStale("legs");
    if (lower >= upper) {
      title = "Lower Body";
      focus = ["quads", "hamstrings", "glutes", "calves"];
    } else {
      title = "Upper Body";
      focus = ["back", "chest", "shoulders", "biceps", "triceps"];
    }
  } else {
    const order = (["push", "pull", "legs"] as (keyof typeof BUCKETS)[]).sort(
      (a, b) => bucketStale(b) - bucketStale(a),
    );
    const pick = order[0];
    title = pick === "push" ? "Push" : pick === "pull" ? "Pull" : "Legs";
    focus = [...BUCKETS[pick]];
  }

  const exercises = selectExercises(focus, available, opts.goal);
  return { title, focus, exercises };
}

function selectExercises(
  muscles: MuscleGroup[],
  available: Equipment[],
  goal: Goal,
): Exercise[] {
  const maxCount = goal === "fat_loss" ? 7 : 6;
  const picked: Exercise[] = [];
  const usedMuscles = new Set<MuscleGroup>();

  // Pass 1: one compound per target muscle (big movers first).
  for (const m of muscles) {
    if (picked.length >= maxCount) break;
    const ex = EXERCISES.filter(
      (e) =>
        e.muscleGroup === m &&
        e.type === "compound" &&
        isAvailable(e, available),
    ).sort((a, b) => equipmentRank(a) - equipmentRank(b))[0];
    if (ex && !picked.some((p) => p.id === ex.id)) {
      picked.push(ex);
      usedMuscles.add(m);
    }
  }

  // Pass 2: fill remaining slots with isolation work for the same muscles.
  for (const m of muscles) {
    if (picked.length >= maxCount) break;
    const ex = EXERCISES.filter(
      (e) =>
        e.muscleGroup === m &&
        e.type === "isolation" &&
        isAvailable(e, available) &&
        !picked.some((p) => p.id === e.id),
    ).sort((a, b) => equipmentRank(a) - equipmentRank(b))[0];
    if (ex) picked.push(ex);
  }

  // compounds first in the final order
  return picked.sort((a, b) => typeRank(a) - typeRank(b));
}

// Prefer free-weight compounds for primary lifts; deterministic tie-break.
function equipmentRank(e: Exercise): number {
  const order: Equipment[] = [
    "barbell",
    "dumbbell",
    "machine",
    "cable",
    "smith",
    "kettlebell",
    "bodyweight",
    "band",
  ];
  return order.indexOf(e.equipment);
}

function typeRank(e: Exercise): number {
  return e.type === "compound" ? 0 : 1;
}
