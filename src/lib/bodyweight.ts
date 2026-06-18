import type { BodyWeightEntry, Goal } from "./types";

export interface WeightTrend {
  current: BodyWeightEntry | null;
  previous: BodyWeightEntry | null;
  first: BodyWeightEntry | null;
  delta: number | null; // current − previous (the latest step)
  totalDelta: number | null; // current − first (whole logged span)
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Summarize a body-weight history (any order) into current value + changes. */
export function weightTrend(entries: BodyWeightEntry[]): WeightTrend {
  if (!entries.length) {
    return { current: null, previous: null, first: null, delta: null, totalDelta: null };
  }
  const sorted = [...entries].sort((a, b) =>
    a.loggedAt < b.loggedAt ? -1 : a.loggedAt > b.loggedAt ? 1 : a.id - b.id,
  );
  const current = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const first = sorted[0];
  return {
    current,
    previous,
    first,
    delta: previous ? round2(current.weight - previous.weight) : null,
    totalDelta: sorted.length > 1 ? round2(current.weight - first.weight) : null,
  };
}

/**
 * Whether a change is "good" given the goal: losing is good for fat loss,
 * gaining is good for muscle/strength, neutral otherwise.
 */
export function changeTone(delta: number, goal: Goal): "good" | "bad" | "neutral" {
  if (Math.abs(delta) < 0.05) return "neutral";
  const losing = delta < 0;
  if (goal === "fat_loss") return losing ? "good" : "bad";
  if (goal === "muscle_gain" || goal === "strength") return losing ? "bad" : "good";
  return "neutral";
}
