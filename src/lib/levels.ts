// Gamification: turn training history into XP, a cosmic level, and badges. All
// DERIVED from what's already logged (sets, reps, sessions, streak) — no new
// tables, no stored score to drift out of sync. The vibe: rising through the
// cosmos, from a Spark to a whole Cosmos, so progress feels special and yours.

export interface LevelInfo {
  level: number; // 1-based
  name: string; // cosmic rank name
  into: number; // XP earned into the current level
  need: number; // XP required to clear the current level
  progress: number; // 0..1 through the current level
  nextName: string; // the rank you're climbing toward
}

// The cosmic ladder — each level a distinct name so every promotion feels new.
// Beyond the last named rank you "ascend" with a star count (Cosmos ✦2, ✦3…).
const RANKS = [
  "Spark",
  "Ember",
  "Cinder",
  "Comet",
  "Meteor",
  "Aurora",
  "Nebula",
  "Nova",
  "Pulsar",
  "Quasar",
  "Starforged",
  "Red Giant",
  "Supernova",
  "Neutron",
  "Magnetar",
  "Galaxy",
  "Constellation",
  "Cosmos",
] as const;

export function rankName(level: number): string {
  if (level <= RANKS.length) return RANKS[level - 1];
  return `${RANKS[RANKS.length - 1]} ✦${level - RANKS.length + 1}`;
}

// XP to climb FROM `level` to the next. Grows smoothly so the first ranks come
// fast (dopamine) and later ones ask for real consistency.
function needForLevel(level: number): number {
  return Math.round(150 * Math.pow(level, 1.4));
}

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let acc = 0;
  // Cap the walk so a wild XP value can't spin forever.
  while (level < 999) {
    const need = needForLevel(level);
    if (xp < acc + need) {
      return {
        level,
        name: rankName(level),
        into: xp - acc,
        need,
        progress: need > 0 ? (xp - acc) / need : 0,
        nextName: rankName(level + 1),
      };
    }
    acc += need;
    level++;
  }
  const need = needForLevel(level);
  return { level, name: rankName(level), into: 0, need, progress: 0, nextName: rankName(level + 1) };
}

// ── XP earned ────────────────────────────────────────────────────────────────
// A finished set is the unit of work: reward volume of quality work, not raw kg
// (which balloons and feels arbitrary — the feedback that kicked this off).
export function xpForSession(opts: { workingSets: number; reps: number; finished: boolean }): number {
  const sets = Math.max(0, opts.workingSets);
  const reps = Math.max(0, opts.reps);
  return sets * 12 + reps + (opts.finished ? 50 : 0);
}

// ── Badges ───────────────────────────────────────────────────────────────────
// Earnable, computed from lifetime aggregates. Kept tiered so there's always a
// next one just out of reach.
export interface BadgeStat {
  totalWorkouts: number;
  streak: number; // consecutive training weeks
  totalSets: number;
  totalVolume: number; // kg·reps lifetime
  distinctExercises: number;
  distinctMuscles: number;
  level: number;
}

export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string; // lucide icon name, resolved by the UI
  earned: boolean;
  /** 0..1 toward earning it (for the not-yet-earned progress ring) */
  progress: number;
}

type BadgeDef = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  goal: number;
  value: (s: BadgeStat) => number;
};

const BADGE_DEFS: BadgeDef[] = [
  { id: "first", name: "First Light", desc: "Finish your first workout", icon: "Sparkles", goal: 1, value: (s) => s.totalWorkouts },
  { id: "ten", name: "Getting Serious", desc: "Finish 10 workouts", icon: "Dumbbell", goal: 10, value: (s) => s.totalWorkouts },
  { id: "fifty", name: "Devoted", desc: "Finish 50 workouts", icon: "Flame", goal: 50, value: (s) => s.totalWorkouts },
  { id: "century", name: "Centurion", desc: "Finish 100 workouts", icon: "Shield", goal: 100, value: (s) => s.totalWorkouts },
  { id: "streak4", name: "On a Roll", desc: "Train 4 weeks in a row", icon: "Flame", goal: 4, value: (s) => s.streak },
  { id: "streak12", name: "Unbreakable", desc: "Train 12 weeks in a row", icon: "Flame", goal: 12, value: (s) => s.streak },
  { id: "sets500", name: "Volume Dealer", desc: "Log 500 sets", icon: "Layers", goal: 500, value: (s) => s.totalSets },
  { id: "vol100k", name: "Six Figures", desc: "Move 100,000 kg total", icon: "TrendingUp", goal: 100_000, value: (s) => s.totalVolume },
  { id: "explorer", name: "Explorer", desc: "Try 25 different exercises", icon: "Compass", goal: 25, value: (s) => s.distinctExercises },
  { id: "wellrounded", name: "Well-Rounded", desc: "Train all 12 muscle groups", icon: "Target", goal: 12, value: (s) => s.distinctMuscles },
  { id: "nova", name: "Reached Nova", desc: "Climb to level 8 (Nova)", icon: "Star", goal: 8, value: (s) => s.level },
  { id: "supernova", name: "Supernova", desc: "Climb to level 13 (Supernova)", icon: "Star", goal: 13, value: (s) => s.level },
];

export function computeBadges(s: BadgeStat): Badge[] {
  return BADGE_DEFS.map((d) => {
    const v = d.value(s);
    return {
      id: d.id,
      name: d.name,
      desc: d.desc,
      icon: d.icon,
      earned: v >= d.goal,
      progress: Math.max(0, Math.min(1, v / d.goal)),
    };
  });
}
