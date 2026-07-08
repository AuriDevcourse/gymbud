// How each exercise is loaded and dosed: what the weight number MEANS, how big
// a jump the +/- buttons make, and how many sets/reps to aim for. All derived
// from the exercise's equipment + type so the workout screen stops treating a
// barbell squat, a pair of dumbbells and a plank identically.

import type { Exercise, MuscleGroup, WeightMode } from "./exercise-library";
import { REP_RANGE, type Goal, type Unit } from "./types";

// What the entered weight represents. Defaults follow the equipment; an
// exercise can override via its `load` field (see exercise-library.ts).
export function weightMode(ex: Exercise): WeightMode {
  if (ex.load) return ex.load;
  if (ex.equipment === "dumbbell" || ex.equipment === "kettlebell") return "each";
  if (ex.equipment === "bodyweight") return "none";
  return "total";
}

// Does this lift take a weight at all? (Plank / push-up / crunch don't.)
export function hasWeight(ex: Exercise): boolean {
  return weightMode(ex) !== "none";
}

// The field label + a short hint, so "40" is never ambiguous.
export function weightLabel(ex: Exercise, unit: Unit): { label: string; hint?: string } {
  switch (weightMode(ex)) {
    case "each":
      return { label: `Weight / hand (${unit})`, hint: "one dumbbell, in each hand" };
    case "added":
      return {
        label: `Added (${unit})`,
        // spells out the per-hand-vs-total question people hit on lunges
        hint: "total extra weight you hold or wear · two dumbbells = add them together · 0 = just bodyweight",
      };
    case "assist":
      return { label: `Assist (${unit})`, hint: "weight the machine takes off, more = easier" };
    case "none":
      return { label: "Bodyweight" };
    default:
      return { label: `Weight (${unit})`, hint: "total load on the bar or stack" };
  }
}

// Smallest sensible jump for the +/- buttons, by equipment.
//  kg: dumbbell 2 · everything else 2.5 (a pair of 1.25 kg plates on a bar).
//  lb: dumbbell 5 · everything else 5. Kept small so a barbell doesn't leap in
//  ~4.5 kg (10 lb) chunks — the fine ±1.25 button under the field handles the
//  in-between loads.
export function weightStep(ex: Exercise, unit: Unit): number {
  if (unit === "lb") {
    return ex.equipment === "dumbbell" ? 5 : 5;
  }
  return ex.equipment === "dumbbell" ? 2 : 2.5;
}

// Rep target, nudged by movement type: compounds sit at the lower (heavier) end
// of the goal range, isolation work at the higher (lighter) end. Feeds both the
// on-screen prescription and the progression coach so they always agree.
export function repRangeFor(goal: Goal, type: Exercise["type"]): { low: number; high: number } {
  const base = REP_RANGE[goal];
  if (type === "compound") {
    return { low: base.low, high: Math.max(base.low + 2, base.high - 3) };
  }
  return { low: base.low + 2, high: base.high + 3 };
}

// Big prime movers that carry more volume than the small assistance muscles.
const LARGE_MUSCLES = new Set<MuscleGroup>([
  "chest",
  "back",
  "quads",
  "hamstrings",
  "glutes",
  "shoulders",
]);

// How many working sets to plan — varied by ROLE, not a flat 4 for everything.
// A heavy compound on a big muscle earns the most sets; an isolation move on a
// small muscle the fewest. Keeps a session from being six identical 4-set slogs.
//   role 2 = compound on a large muscle (e.g. squat, bench)
//   role 1 = compound on a small muscle OR isolation on a large one
//   role 0 = isolation on a small muscle (e.g. calf raise, curl)
export function targetSetsFor(
  goal: Goal,
  ex: Pick<Exercise, "type" | "muscleGroup">,
): number {
  const role = (ex.type === "compound" ? 1 : 0) + (LARGE_MUSCLES.has(ex.muscleGroup) ? 1 : 0);
  if (goal === "strength") return [3, 4, 5][role];
  if (goal === "muscle_gain") return [2, 3, 4][role];
  return [2, 2, 3][role]; // fat_loss, general
}

// One-line "why this dose" caption for the card.
export function doseCaption(goal: Goal, ex: Pick<Exercise, "type" | "muscleGroup">): string {
  const r = repRangeFor(goal, ex.type);
  const sets = targetSetsFor(goal, ex);
  const kind = ex.type === "compound" ? "Compound" : "Isolation";
  return `${kind} · ${sets} sets × ${r.low} to ${r.high} reps`;
}
