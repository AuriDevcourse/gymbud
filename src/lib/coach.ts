import {
  EXERCISES,
  EXERCISES_BY_ID,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from "./exercise-library";
import { repRangeFor, snapWeight, weightStep } from "./loading";
import { REP_RANGE, type Difficulty, type Goal, type Recommendation, type Unit } from "./types";

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
  lastDifficulty?: Difficulty | null,
  ex?: Exercise, // when given, rep target + weight jump match this exercise
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

  const range = ex ? repRangeFor(goal, ex.type, ex.muscleGroup) : REP_RANGE[goal];
  const step = ex ? weightStep(ex, unit) : increment(unit);
  const u = unit;
  // Suggestions must be weights that exist on the machine: snap lb-stack
  // equipment (cable/machine) to real pin positions — 41, not 40.
  const round = (w: number): number => {
    const snapped = ex ? snapWeight(ex, unit, w) : w;
    const grain = unit === "kg" ? 0.5 : 1;
    return Math.round(snapped / grain) * grain;
  };

  // Below the bottom of the range -> too heavy, ease off and rebuild.
  if (cur.reps < range.low) {
    return {
      action: "back_off",
      reason: `Only ${cur.reps} reps at ${cur.weight}${u}, below your ${range.low}-rep target. Drop a touch and own the form.`,
      suggestedWeight: round(Math.max(0, cur.weight - step)),
      lastTopSet: last,
    };
  }

  // RPE override: if it felt hard last time, hold the weight even at the top of
  // the range. Add weight only once it stops being a grind.
  if (lastDifficulty === "hard") {
    return {
      action: "maintain",
      reason: `You rated this hard at ${cur.weight}${u}. Stay here until it feels solid, then add weight.`,
      suggestedWeight: round(cur.weight),
      lastTopSet: last,
    };
  }

  // Hit the top of the range, OR it felt easy and you're already in range
  // -> add weight next time.
  if (cur.reps >= range.high || (lastDifficulty === "easy" && cur.reps >= range.low)) {
    const reason =
      lastDifficulty === "easy"
        ? `Felt easy at ${cur.weight}${u} for ${cur.reps}. Add weight next session.`
        : `You got ${cur.reps} reps at ${cur.weight}${u}, the top of your range. Add weight next session.`;
    return {
      action: "increase",
      reason,
      suggestedWeight: round(cur.weight + step),
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
    suggestedWeight: round(cur.weight),
    lastTopSet: last,
  };
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

  // 3) top-up: if the primary-muscle pool is thin (traps, calves, forearms…),
  // pull in moves that SHARE a muscle (primary or secondary) so there are always
  // at least a handful of real options — the "never a dead end, ≥5 swaps" rule.
  const baseMuscles = new Set([base.muscleGroup, ...(base.secondary ?? [])]);
  const shareMuscle = EXERCISES.filter(
    (e) =>
      e.id !== base.id &&
      (baseMuscles.has(e.muscleGroup) || (e.secondary ?? []).some((m) => baseMuscles.has(m))),
  );

  const seen = new Set<string>();
  const pool = [...curated, ...sameMuscle, ...shareMuscle].filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return pool.sort((a, b) => score(b) - score(a));
}

/** Convenience: the top N swaps, guaranteed to be at least `min` when the library allows. */
export function alternativesFor(exerciseId: string, available: Equipment[] = []): Exercise[] {
  return getAlternatives(exerciseId, { available });
}

// ── Workout suggestion ────────────────────────────────────────────────────
const BUCKETS: Record<"push" | "pull" | "legs", MuscleGroup[]> = {
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "traps", "biceps", "forearms"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
};

export interface Suggestion {
  title: string;
  focus: MuscleGroup[];
  exercises: Exercise[];
}

// User-pickable workout focus. "auto" = let the coach decide from frequency.
export type WorkoutFocus =
  | "auto"
  | "full_body"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "legs";

export const FOCUS_LABELS: Record<WorkoutFocus, string> = {
  auto: "Auto",
  full_body: "Full Body",
  upper: "Upper",
  lower: "Lower",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

// How much time you have. Drives how many exercises the suggestion picks so a
// time-boxed day (e.g. "only an hour") gets a shorter, compound-first session.
export type WorkoutLength = "short" | "medium" | "long";

export const LENGTH_LABELS: Record<WorkoutLength, string> = {
  short: "~30 min",
  medium: "~45 min",
  long: "~60 min",
};

// base exercise count per length; fat-loss adds one (more, lighter movements)
const LENGTH_COUNT: Record<WorkoutLength, number> = { short: 4, medium: 6, long: 8 };

const FOCUS_MUSCLES: Record<Exclude<WorkoutFocus, "auto">, MuscleGroup[]> = {
  full_body: ["quads", "back", "chest", "shoulders", "hamstrings", "core", "biceps", "triceps"],
  upper: ["back", "chest", "shoulders", "traps", "biceps", "triceps", "core"],
  lower: ["quads", "hamstrings", "glutes", "calves"],
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "traps", "biceps", "forearms"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
};

const FOCUS_TITLE: Record<Exclude<WorkoutFocus, "auto">, string> = {
  full_body: "Full Body",
  upper: "Upper Body",
  lower: "Lower Body",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

/**
 * Suggest today's session from the goal, weekly frequency and which muscles
 * were trained recently. Stale muscles get priority; compounds come first.
 */
export function suggestWorkout(opts: {
  goal: Goal;
  daysPerWeek: number;
  available?: Equipment[];
  daysSince: Partial<Record<MuscleGroup, number>>; // days since each muscle trained
  seed?: number; // 0 = canonical pick; any other value = a randomized variation
  rotation?: number; // sessions done so far — rotates the canonical pick so today
  // isn't a carbon copy of last time (only used when seed === 0)
  focus?: WorkoutFocus; // explicit user choice; "auto"/undefined = decide below
  length?: WorkoutLength; // how much time you have; defaults to "medium"
}): Suggestion {
  const available = opts.available ?? [];
  const staleness = (m: MuscleGroup) => opts.daysSince[m] ?? 999;
  const bucketStale = (b: keyof typeof BUCKETS) =>
    BUCKETS[b].reduce((sum, m) => sum + staleness(m), 0) / BUCKETS[b].length;

  let title: string;
  let focus: MuscleGroup[];

  if (opts.focus && opts.focus !== "auto") {
    title = FOCUS_TITLE[opts.focus];
    focus = [...FOCUS_MUSCLES[opts.focus]];
  } else if (opts.daysPerWeek <= 3) {
    // Full-body: one compound from each region + accessories for the stalest.
    title = "Full Body";
    focus = [...FOCUS_MUSCLES.full_body];
  } else if (opts.daysPerWeek === 4) {
    const upper = (bucketStale("push") + bucketStale("pull")) / 2;
    const lower = bucketStale("legs");
    if (lower >= upper) {
      title = "Lower Body";
      focus = ["quads", "hamstrings", "glutes", "calves"];
    } else {
      title = "Upper Body";
      focus = ["back", "chest", "shoulders", "biceps", "triceps", "core"];
    }
  } else {
    const order = (["push", "pull", "legs"] as (keyof typeof BUCKETS)[]).sort(
      (a, b) => bucketStale(b) - bucketStale(a),
    );
    const pick = order[0];
    title = pick === "push" ? "Push" : pick === "pull" ? "Pull" : "Legs";
    focus = [...BUCKETS[pick]];
  }

  const length = opts.length ?? "medium";
  const maxCount = LENGTH_COUNT[length] + (opts.goal === "fat_loss" ? 1 : 0);
  const exercises = selectExercises(focus, available, opts.seed ?? 0, maxCount, opts.rotation ?? 0);
  return { title, focus, exercises };
}

// tiny deterministic PRNG so a given seed always yields the same variation
function makeRng(seed: number): () => number {
  let s = (seed || 1) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function selectExercises(
  muscles: MuscleGroup[],
  available: Equipment[],
  seed: number,
  maxCount: number,
  rotation: number,
): Exercise[] {
  const picked: Exercise[] = [];
  const rng = makeRng(seed);

  // seed 0 => the canonical pick, but ROTATED: rank candidates by equipment
  // quality, then step through the top few by `rotation` (sessions done) so
  // consecutive sessions vary the lift without dropping to a weak choice.
  // any other seed => a random valid pick (the manual Shuffle button).
  const choose = (cands: Exercise[]): Exercise | undefined => {
    if (!cands.length) return undefined;
    if (seed === 0) {
      const ranked = [...cands].sort((a, b) => equipmentRank(a) - equipmentRank(b));
      const topN = Math.min(3, ranked.length);
      return ranked[rotation % topN];
    }
    return cands[Math.floor(rng() * cands.length)];
  };

  // Pass 1: one compound per target muscle (big movers).
  for (const m of muscles) {
    if (picked.length >= maxCount) break;
    const ex = choose(
      EXERCISES.filter(
        (e) =>
          e.muscleGroup === m &&
          e.type === "compound" &&
          isAvailable(e, available) &&
          !picked.some((p) => p.id === e.id),
      ),
    );
    if (ex) picked.push(ex);
  }

  // Pass 2: fill remaining slots with isolation work. Cover muscles that got
  // NOTHING in pass 1 first — biceps/forearms have no compounds, so without
  // this they were always squeezed out by a second chest or back slot and the
  // user "never sees a biceps exercise".
  const covered = new Set(picked.map((p) => p.muscleGroup));
  const fillOrder = [...muscles.filter((m) => !covered.has(m)), ...muscles.filter((m) => covered.has(m))];
  for (const m of fillOrder) {
    if (picked.length >= maxCount) break;
    const ex = choose(
      EXERCISES.filter(
        (e) =>
          e.muscleGroup === m &&
          e.type === "isolation" &&
          isAvailable(e, available) &&
          !picked.some((p) => p.id === e.id),
      ),
    );
    if (ex) picked.push(ex);
  }

  // Guarantee an ab/core move when core is targeted. Core has no compound to
  // anchor a pass-1 slot, so it kept getting squeezed out — leaving sessions
  // looking like abs only come from cardio. Swap out an overflow pick if needed.
  if (muscles.includes("core") && !picked.some((p) => p.muscleGroup === "core")) {
    const core = choose(
      EXERCISES.filter(
        (e) =>
          e.muscleGroup === "core" &&
          isAvailable(e, available) &&
          !picked.some((p) => p.id === e.id),
      ),
    );
    if (core) {
      if (picked.length >= maxCount) picked[picked.length - 1] = core;
      else picked.push(core);
    }
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
