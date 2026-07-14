import { EXERCISES_BY_ID, type MuscleGroup } from "./exercise-library";
import { MUSCLE_LABELS } from "./types";

// Warm-up and cool-down that actually fit today's session — the muscles you're
// about to train and the first lift you'll do — instead of the same three lines
// every time. Deterministic (seeded by the session) so it doesn't reshuffle on
// every render, but different sessions get different phrasing.

interface Plan {
  lead: string;
  tips: string[];
  seconds: number; // suggested duration, scaled to the session (not a flat 5 min)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Mobility drills to PRIME each muscle before working sets.
const PRIME: Record<MuscleGroup, string> = {
  chest: "band pull-aparts and slow arm circles",
  back: "cat-cow and a few scapular pull-ups",
  traps: "shoulder shrugs and gentle neck rolls",
  shoulders: "shoulder dislocates and arm circles",
  biceps: "light band curls and elbow circles",
  triceps: "band press-downs and overhead reaches",
  forearms: "wrist circles and easy squeezes",
  quads: "bodyweight squats and forward leg swings",
  hamstrings: "leg swings and slow toe-touch reaches",
  glutes: "glute bridges and hip openers",
  calves: "ankle circles and slow calf raises",
  core: "cat-cow and dead bugs",
};

// Static stretches to unwind each muscle after training.
const STRETCH: Record<MuscleGroup, string> = {
  chest: "a doorway chest stretch",
  back: "child's pose and a lat stretch",
  traps: "a neck side-stretch each way",
  shoulders: "a cross-body shoulder stretch",
  biceps: "a wall biceps stretch",
  triceps: "an overhead triceps stretch",
  forearms: "wrist flexor and extensor stretches",
  quads: "a standing quad stretch",
  hamstrings: "a seated hamstring stretch",
  glutes: "a figure-4 glute stretch",
  calves: "a wall calf stretch",
  core: "a gentle cobra / back extension",
};

const WARM_CARDIO = [
  "5 min easy bike to raise your heart rate",
  "5 min row at a conversational pace",
  "5 min brisk incline walk",
  "4 min: jumping jacks, high knees, easy skips",
  "5 min on the elliptical, building gently",
];
const COOL_CARDIO = [
  "3–5 min easy walk to bring the heart rate down",
  "3 min of slow, light cycling",
  "a few minutes of relaxed walking",
];

// muscles trained today, most-used first
function musclesOf(exerciseIds: string[]): MuscleGroup[] {
  const count = new Map<MuscleGroup, number>();
  for (const id of exerciseIds) {
    const ex = EXERCISES_BY_ID[id];
    if (!ex) continue;
    count.set(ex.muscleGroup, (count.get(ex.muscleGroup) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function joinMuscles(ms: MuscleGroup[]): string {
  const labels = ms.map((m) => MUSCLE_LABELS[m].toLowerCase());
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export function warmupPlan(exerciseIds: string[], seed = 0): Plan {
  const muscles = musclesOf(exerciseIds);
  const top = muscles.slice(0, 2);
  const firstEx = EXERCISES_BY_ID[exerciseIds[0]];
  const tips: string[] = [pick(WARM_CARDIO, seed)];

  if (top.length) {
    const drills = top.map((m) => PRIME[m]).join(", then ");
    tips.push(`Mobility for ${joinMuscles(top)}: ${drills}`);
  } else {
    tips.push("Dynamic stretches and joint circles head to toe");
  }

  if (firstEx) {
    tips.push(`2 light ramp-up sets on ${firstEx.name} before your working weight`);
  } else {
    tips.push("1–2 light ramp-up sets on your first lift");
  }

  return {
    lead: top.length
      ? `Prime ${joinMuscles(top)} before the working sets.`
      : "Prime your body before the working sets.",
    tips,
    // Longer warm-up for a bigger session; ~2–5 min, not a flat 5.
    seconds: clamp(90 + 35 * exerciseIds.length, 120, 300),
  };
}

export function cooldownPlan(exerciseIds: string[], seed = 0): Plan {
  const muscles = musclesOf(exerciseIds);
  const top = muscles.slice(0, 3);
  const tips: string[] = [pick(COOL_CARDIO, seed)];

  if (top.length) {
    const stretches = top.map((m) => STRETCH[m]).join(", ");
    tips.push(`Stretch what you trained: ${stretches}`);
  } else {
    tips.push("Static stretches for the muscles you trained");
  }
  tips.push("A minute of slow nasal breathing to wind down");

  return {
    lead: "Bring your heart rate down and help recovery.",
    tips,
    seconds: clamp(60 + 20 * exerciseIds.length, 90, 240),
  };
}
