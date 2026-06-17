import type { Unit } from "./types";

export function defaultBar(unit: Unit): number {
  return unit === "kg" ? 20 : 45;
}

function plateSet(unit: Unit): number[] {
  return unit === "kg" ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
}

export interface PlateBreakdown {
  perSide: number[]; // one entry per plate to load on EACH side
  leftover: number; // weight that can't be matched with available plates
  belowBar: boolean;
}

/** Which plates to load on each side to reach the target on a standard bar. */
export function platesPerSide(
  target: number,
  unit: Unit,
  bar = defaultBar(unit),
): PlateBreakdown {
  if (target < bar) return { perSide: [], leftover: 0, belowBar: true };
  let each = (target - bar) / 2;
  const perSide: number[] = [];
  for (const p of plateSet(unit)) {
    while (each + 1e-6 >= p) {
      perSide.push(p);
      each -= p;
    }
  }
  return { perSide, leftover: Math.round(each * 100) / 100, belowBar: false };
}
