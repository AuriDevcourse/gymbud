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

// Hand-curated matches for lifts the scorer can't find on its own (naming gaps
// in the Free Exercise DB — e.g. it calls a woodchop "Wood Chop", files reverse
// curls under biceps, and has no plain dumbbell deadlift). Value is the EXACT
// `name` of the entry to use. Only add pairs whose demo genuinely shows the
// same movement; a lift with no honest match stays demo-less on purpose.
// `null` = audited, no honest entry exists AND the scorer's best guess is a
// different movement — force demo-less rather than teach the wrong thing.
const CURATED: Record<string, string | null> = {
  "dumbbell-deadlift": "Stiff-Legged Dumbbell Deadlift",
  "kettlebell-deadlift": "Kettlebell One-Legged Deadlift",
  "machine-pulldown": "Full Range-Of-Motion Lat Pulldown",
  "barbell-overhead-press": "Barbell Shoulder Press",
  "cable-leg-extension": "Leg Extensions",
  "cable-leg-curl": "Lying Leg Curls",
  "band-leg-curl": "Seated Band Hamstring Curl",
  "nordic-curl": "Natural Glute Ham Raise",
  "machine-kickback": "One-Legged Cable Kickback",
  "band-kickback": "Glute Kickback",
  "cable-woodchop": "Standing Cable Wood Chop",
  "band-woodchop": "Standing Cable Wood Chop",
  "reverse-barbell-curl": "Reverse Barbell Curl",
  "reverse-dumbbell-curl": "Standing Dumbbell Reverse Curl",
  "kettlebell-overhead-tricep-extension": "Standing Dumbbell Triceps Extension",
  "bulgarian-split-squat": "Split Squat with Dumbbells",
  "single-leg-dumbbell-rdl": "Kettlebell One-Legged Deadlift",
  "hip-abduction-machine": "Thigh Abductor",
  "farmers-carry": "Farmer's Walk",
  "dumbbell-reverse-wrist-curl": "Palms-Down Dumbbell Wrist Curl Over A Bench",
  "side-lying-leg-raise": "Side Leg Raises",
  "zottman-curl": "Zottman Curl", // filed under forearms here, biceps in the DB
  "wrist-roller": "Wrist Roller", // scorer would pick "Wrist Circles" (a mobility drill)
  "single-leg-press": "Leg Press", // no unilateral entry in the DB; same machine + motion
  "donkey-calf-raise": "Donkey Calf Raises", // scorer would prefer a standing-calf photo
  "hip-adduction-machine": "Thigh Adductor",
  "reverse-hyperextension": "Reverse Hyperextension", // DB files it under hamstrings
  "dumbbell-sumo-squat": "Plie Dumbbell Squat",
  "monster-walk": "Monster Walk", // DB files it under abductors
  "chest-supported-row": "Dumbbell Incline Row", // same movement: prone row on an incline bench
  "back-extension": "Hyperextensions (Back Extensions)",
  "box-jump": "Front Box Jump",
  "mountain-climber": "Mountain Climbers", // DB files it under quadriceps
  "turkish-get-up": "Kettlebell Turkish Get-Up (Lunge style)",
  // regression guards: our anatomical filing (glutes / hamstrings) differs
  // from the DB's, which sinks these below the auto-match threshold
  "sumo-deadlift": "Sumo Deadlift",
  "kettlebell-snatch": "One-Arm Kettlebell Snatch",
  // full-library audit (2026-07): the scorer's pick showed a DIFFERENT movement
  "assisted-chin-up": "Chin-Up", // was: a bent-over row
  "cable-pull-through": "Pull Through", // was: a seated lat pulldown
  "band-tricep-pushdown": "Triceps Pushdown", // was: an overhead extension
  "bodyweight-calf-raise": "Rocking Standing Calf Raise", // was: a static stretch
  "dumbbell-wrist-curl": "Seated Dumbbell Palms-Up Wrist Curl", // was: palms-DOWN (extensors)
  "landmine-press": "Landmine Linear Jammer", // was: a lying neck press
  "smith-bulgarian-split-squat": "Smith Single-Leg Split Squat", // was: a lateral split squat
  "side-plank": "Side Bridge", // was: a front plank
  "cable-upright-row": "Upright Cable Row", // was: a rear-delt row
  "captain-chair-leg-raise": "Knee/Hip Raise On Parallel Bars", // was: a supine hip raise
  "sissy-squat": "Weighted Sissy Squat", // was: a plain air squat
  "hollow-body-hold": null, // was: a rotational crunch; no hollow-hold entry exists
  // audit: same family, but an exact / clearly better entry exists
  "trap-bar-deadlift": "Trap Bar Deadlift",
  "barbell-bench-press": "Barbell Bench Press - Medium Grip", // was: guillotine press
  "push-up": "Pushups", // was: clock push-up novelty
  "cable-fly": "Cable Crossover", // was: the incline version
  "dumbbell-row": "One-Arm Dumbbell Row", // was: chest-supported incline row
  "t-bar-row": "T-Bar Row with Handle",
  "lat-pulldown": "Wide-Grip Lat Pulldown", // was: one-arm variant
  "machine-row": "Leverage Iso Row", // was: high row
  "cable-curl": "Standing Biceps Cable Curl", // was: preacher variant
  "skull-crusher": "Lying Triceps Press", // was: press/crusher hybrid
  "dumbbell-skull-crusher": "Lying Dumbbell Tricep Extension", // was: band variant
  "dumbbell-overhead-tricep-extension": "Seated Triceps Press", // was: cable rope
  "dip": "Dips - Triceps Version", // was: bench dips
  "diamond-push-up": "Push-Ups - Close Triceps Position", // was: "Body-Up"
  "barbell-calf-raise": "Standing Barbell Calf Raise", // was: seated
  "glute-bridge": "Butt Lift (Bridge)", // was: single-leg variant
  "bicycle-crunch": "Air Bike", // was: plain crunch, no rotation
  "dumbbell-rear-delt-fly": "Seated Bent-Over Rear Delt Raise", // was: lying-prone
  "ez-bar-curl": "EZ-Bar Curl", // was: straight-bar curl
  "machine-lateral-raise": "Side Lateral Raise", // no machine entry; honest pattern
  // audit: honest matches found for previously demo-less lifts
  "band-curl": "Standing Biceps Cable Curl", // constant-tension standing curl
  "band-leg-extension": "Leg Extensions",
  "cable-leg-raise": "Cable Reverse Crunch",
};

function bestMatch(ex: Exercise, db: DbEntry[]): DbEntry | null {
  const curatedName = CURATED[ex.id];
  if (curatedName === null) return null; // audited: nothing honest to show
  if (curatedName) {
    const curated = db.find((e) => e.name === curatedName && e.images?.length);
    if (curated) return curated;
  }
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
    // Muscle group is a hard discriminator: reward a match, PENALISE a clear
    // mismatch. Without this, a "Machine Lateral Raise" (shoulders) could match a
    // "Machine Calf Raise" just on the shared words "machine" + "raise".
    if (e.primaryMuscles?.length) {
      if (e.primaryMuscles.some((m) => wantMuscle.includes(m.toLowerCase()))) s += 3;
      else s -= 6;
    }
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
