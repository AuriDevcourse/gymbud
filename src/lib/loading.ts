// How each exercise is loaded and dosed: what the weight number MEANS, how big
// a jump the +/- buttons make, and how many sets/reps to aim for. All derived
// from the exercise's equipment + type so the workout screen stops treating a
// barbell squat, a pair of dumbbells and a plank identically.

import type { Exercise, WeightMode } from "./exercise-library";
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
//  dumbbell 2 · barbell/smith 5 · everything else 2.5 (kg). Doubled-ish for lb.
export function weightStep(ex: Exercise, unit: Unit): number {
  if (unit === "lb") {
    if (ex.equipment === "dumbbell") return 5;
    if (ex.equipment === "barbell" || ex.equipment === "smith") return 10;
    return 5;
  }
  if (ex.equipment === "dumbbell") return 2;
  if (ex.equipment === "barbell" || ex.equipment === "smith") return 5;
  return 2.5;
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

// How many working sets to plan: compounds get one more than isolation.
export function targetSetsFor(goal: Goal, type: Exercise["type"]): number {
  if (goal === "strength") return type === "compound" ? 5 : 4;
  if (goal === "muscle_gain") return type === "compound" ? 4 : 3;
  return 3; // fat_loss, general
}

// One-line "why this dose" caption for the card.
export function doseCaption(goal: Goal, type: Exercise["type"]): string {
  const r = repRangeFor(goal, type);
  const sets = targetSetsFor(goal, type);
  const kind = type === "compound" ? "Compound" : "Isolation";
  return `${kind} · ${sets} sets × ${r.low} to ${r.high} reps`;
}
