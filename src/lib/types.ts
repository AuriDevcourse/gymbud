import type { Equipment, MuscleGroup } from "./exercise-library";

export type Goal = "muscle_gain" | "fat_loss" | "strength" | "general";
export type Unit = "kg" | "lb";

export interface Profile {
  name: string; // optional display name for the greeting ("" = none)
  goal: Goal;
  daysPerWeek: number;
  equipment: Equipment[]; // equipment the user has access to ([] = assume all)
  unit: Unit;
  onboarded: boolean;
  updatedAt: string;
}

export interface BodyWeightEntry {
  id: number;
  weight: number;
  loggedAt: string; // YYYY-MM-DD
}

export type RunKind = "long" | "short" | "interval";

export const RUN_KIND_LABELS: Record<RunKind, string> = {
  long: "Long run",
  short: "Short run",
  interval: "Interval",
};

export interface Run {
  id: number;
  distance: number; // kilometres
  duration: number; // seconds
  kind: RunKind;
  loggedAt: string; // YYYY-MM-DD
  note: string | null;
  sessionId: number | null; // set when the run was part of a workout session
}

export interface WorkoutStats {
  streak: number; // consecutive Monday-weeks (user's tz) with a workout or run
  thisWeekSets: number; // working sets in the current Monday-week (user's tz)
  totalWorkouts: number; // finished sessions all-time
}

export type SetType = "normal" | "warmup" | "drop" | "failure";

export interface SetLog {
  id: number;
  sessionExerciseId: number;
  setIndex: number;
  weight: number;
  reps: number;
  type: SetType;
}

export const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: "Working",
  warmup: "Warm-up",
  drop: "Drop set",
  failure: "To failure",
};

// short badge shown on a set row (Working has no badge)
export const SET_TYPE_BADGE: Record<SetType, string> = {
  normal: "",
  warmup: "W",
  drop: "D",
  failure: "F",
};

export type Difficulty = "easy" | "right" | "hard";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  right: "Just right",
  hard: "Hard",
};

export interface SessionExercise {
  id: number;
  sessionId: number;
  exerciseId: string;
  orderIndex: number;
  difficulty: Difficulty | null;
  sets: SetLog[];
}

export interface Session {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  note: string | null;
  exercises: SessionExercise[];
}

export type CoachAction = "increase" | "maintain" | "back_off" | "start";

export interface Recommendation {
  action: CoachAction;
  reason: string;
  suggestedWeight: number | null;
  lastTopSet: { weight: number; reps: number } | null;
}

// ── Display labels (Title Case, no emojis) ──────────────────────────────
export const GOAL_LABELS: Record<Goal, string> = {
  muscle_gain: "Muscle Gain",
  fat_loss: "Fat Loss",
  strength: "Strength",
  general: "General Fitness",
};

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  traps: "Traps",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
  forearms: "Forearms",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  kettlebell: "Kettlebell",
  band: "Band",
  smith: "Smith Machine",
};

// Target rep range per goal — drives the progression coach.
export const REP_RANGE: Record<Goal, { low: number; high: number }> = {
  strength: { low: 3, high: 6 },
  muscle_gain: { low: 8, high: 12 },
  fat_loss: { low: 12, high: 15 },
  general: { low: 8, high: 12 },
};
