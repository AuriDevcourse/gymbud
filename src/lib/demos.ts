import { getDb } from "./db";
import {
  EXERCISES_BY_ID,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from "./exercise-library";

// Exercise demos from the PUBLIC-DOMAIN Free Exercise DB
// (github.com/yuhonas/free-exercise-db). No API key. We match our library to
// it ONCE (cached in the demo_cache table), and the browser loads the photos
// directly from the jsdelivr CDN — so this works on serverless (no disk).

const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main";

interface DbEntry {
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  instructions: string[];
  images: string[];
}

let listCache: DbEntry[] | null = null; // per-instance memory cache
async function loadList(): Promise<DbEntry[]> {
  if (listCache) return listCache;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${CDN}/dist/exercises.json`, { signal: ctrl.signal });
    if (!res.ok) return [];
    listCache = (await res.json()) as DbEntry[];
    return listCache;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

const EQUIP: Record<Equipment, string[]> = {
  barbell: ["barbell"],
  dumbbell: ["dumbbell"],
  machine: ["machine"],
  cable: ["cable"],
  bodyweight: ["body only"],
  kettlebell: ["kettlebells"],
  band: ["bands"],
  smith: ["machine", "barbell"],
};
const MUSCLE: Record<MuscleGroup, string[]> = {
  chest: ["chest"],
  back: ["lats", "middle back", "lower back"],
  traps: ["traps"],
  shoulders: ["shoulders"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  quads: ["quadriceps"],
  hamstrings: ["hamstrings"],
  glutes: ["glutes"],
  calves: ["calves"],
  core: ["abdominals"],
  forearms: ["forearms"],
};
const STOP = new Set(["barbell", "dumbbell", "cable", "machine", "smith", "band", "kettlebell"]);

// Distinctive variant words. If OUR exercise has one and a candidate lacks it,
// it's almost certainly the wrong variant (e.g. an "incline" press must not match
// a flat bench photo) — penalise hard so we'd rather show no photo than a wrong one.
const MODIFIERS = [
  "incline", "decline", "seated", "standing", "reverse", "front", "overhead",
  "romanian", "sumo", "bulgarian", "hack", "goblet", "preacher", "hammer",
  "concentration", "spider", "deficit", "close", "wide", "single", "pause",
];

const norm = (s: string) => s.toLowerCase().replace(/-/g, " ");

function bestMatch(ex: Exercise, db: DbEntry[]): DbEntry | null {
  const exName = norm(ex.name);
  const exTokens = exName.split(/\s+/).filter((w) => !STOP.has(w));
  const exSet = new Set(exTokens);
  const exMods = MODIFIERS.filter((m) => exName.includes(m));
  const wantEquip = EQUIP[ex.equipment];
  const wantMuscle = MUSCLE[ex.muscleGroup];
  let best: DbEntry | null = null;
  let bestScore = -Infinity;
  for (const e of db) {
    if (!e.images?.length) continue;
    const name = norm(e.name);
    const nameTokens = name.split(/\s+/);
    let s = 0;
    let hits = 0;
    for (const tok of exTokens)
      if (name.includes(tok)) {
        s += 2;
        hits++;
      }
    if (hits === 0) continue;
    // Equipment matters: a dumbbell move should not show a barbell demo. Reward
    // the right gear, and penalise the wrong gear hard so we'd rather show no
    // demo than a misleading one.
    if (e.equipment) {
      if (wantEquip.includes(e.equipment.toLowerCase())) s += 3;
      else s -= 4;
    }
    if (e.primaryMuscles?.some((m) => wantMuscle.includes(m.toLowerCase()))) s += 2;
    // Wrong-variant guard: every modifier our lift has must appear in the match.
    for (const m of exMods) if (!name.includes(m)) s -= 6;
    for (const t of nameTokens) if (!exSet.has(t) && !STOP.has(t)) s -= 1;
    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }
  return best && bestScore >= 3 ? best : null;
}

export interface DemoMeta {
  available: boolean;
  frames: number;
  name?: string;
  instructions?: string[];
  images?: string[]; // full CDN URLs
}

export async function getDemoMeta(ourId: string): Promise<DemoMeta> {
  const ex = EXERCISES_BY_ID[ourId];
  if (!ex) return { available: false, frames: 0 };

  const db = await getDb();
  const cached = (
    await db.execute({
      sql: "SELECT name, frames, instructions, images, missing FROM demo_cache WHERE exercise_id = ?",
      args: [ourId],
    })
  ).rows[0];

  if (cached) {
    if (Number(cached.missing)) return { available: false, frames: 0 };
    return {
      available: true,
      frames: Number(cached.frames),
      name: String(cached.name),
      instructions: JSON.parse(String(cached.instructions)),
      images: JSON.parse(String(cached.images)),
    };
  }

  const list = await loadList();
  if (!list.length) return { available: false, frames: 0 }; // transient: don't cache

  const match = bestMatch(ex, list);
  if (!match) {
    await db.execute({
      sql: "INSERT OR REPLACE INTO demo_cache (exercise_id, missing) VALUES (?, 1)",
      args: [ourId],
    });
    return { available: false, frames: 0 };
  }

  const images = match.images.slice(0, 2).map((p) => `${CDN}/exercises/${p}`);
  const instructions = match.instructions ?? [];
  await db.execute({
    sql: "INSERT OR REPLACE INTO demo_cache (exercise_id, name, frames, instructions, images, missing) VALUES (?, ?, ?, ?, ?, 0)",
    args: [ourId, match.name, images.length, JSON.stringify(instructions), JSON.stringify(images)],
  });
  return { available: true, frames: images.length, name: match.name, instructions, images };
}
