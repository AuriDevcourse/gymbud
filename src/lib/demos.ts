import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EXERCISES_BY_ID, type Equipment, type Exercise, type MuscleGroup } from "./exercise-library";

// Exercise demos from the open-source, PUBLIC-DOMAIN Free Exercise DB
// (github.com/yuhonas/free-exercise-db). No API key, no cost. Each exercise has
// 1-2 photos (start / end position) + written instructions. We match our
// library to it, download the photos ONCE to data/demos/, and serve them from
// our own origin so views are instant and work offline after the first fetch.

const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main";
const DIR = path.join(process.cwd(), "data", "demos");
const DB = path.join(DIR, "_db.json");
const MAP = path.join(DIR, "_map.json");

interface DbEntry {
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  instructions: string[];
  images: string[];
}
type MapEntry =
  | { name: string; frames: number; instructions: string[] }
  | { missing: true };
type DemoMap = Record<string, MapEntry>;

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}
function writeJson(file: string, data: unknown) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(data));
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

let dbCache: DbEntry[] | null = null;
async function loadDb(): Promise<DbEntry[]> {
  if (dbCache) return dbCache;
  const onDisk = readJson<DbEntry[]>(DB);
  if (onDisk) return (dbCache = onDisk);
  const res = await fetchWithTimeout(`${CDN}/dist/exercises.json`, 12000);
  if (!res || !res.ok) return [];
  try {
    const data = (await res.json()) as DbEntry[];
    writeJson(DB, data);
    return (dbCache = data);
  } catch {
    return [];
  }
}

// Map our taxonomy to Free Exercise DB's vocabulary for scoring.
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

function bestMatch(ex: Exercise, db: DbEntry[]): DbEntry | null {
  const exTokens = ex.name.toLowerCase().split(/\s+/).filter((w) => !STOP.has(w));
  const wantEquip = EQUIP[ex.equipment];
  const wantMuscle = MUSCLE[ex.muscleGroup];
  const exSet = new Set(exTokens);
  let best: DbEntry | null = null;
  let bestScore = -Infinity;
  for (const e of db) {
    if (!e.images?.length) continue;
    const nameTokens = e.name.toLowerCase().split(/\s+/);
    const name = e.name.toLowerCase();
    let s = 0;
    let nameHits = 0;
    for (const tok of exTokens)
      if (name.includes(tok)) {
        s += 2;
        nameHits++;
      }
    if (nameHits === 0) continue; // no name overlap at all -> skip
    if (e.equipment && wantEquip.includes(e.equipment.toLowerCase())) s += 2;
    if (e.primaryMuscles?.some((m) => wantMuscle.includes(m.toLowerCase()))) s += 2;
    // penalize unrequested modifiers (decline/incline/seated/...) so the
    // plainest variant wins ties
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
}

export async function getDemoMeta(ourId: string): Promise<DemoMeta> {
  const ex = EXERCISES_BY_ID[ourId];
  if (!ex) return { available: false, frames: 0 };

  mkdirSync(DIR, { recursive: true });
  const map = readJson<DemoMap>(MAP) ?? {};
  const cached = map[ourId];
  if (cached && "missing" in cached) return { available: false, frames: 0 };
  if (cached && "frames" in cached && framesExist(ourId, cached.frames)) {
    return { available: true, frames: cached.frames, name: cached.name, instructions: cached.instructions };
  }

  const db = await loadDb();
  const match = db.length ? bestMatch(ex, db) : null;
  if (!match) {
    map[ourId] = { missing: true };
    writeJson(MAP, map);
    return { available: false, frames: 0 };
  }

  const frames = await downloadFrames(ourId, match.images.slice(0, 2));
  if (frames === 0) {
    map[ourId] = { missing: true };
    writeJson(MAP, map);
    return { available: false, frames: 0 };
  }
  const entry = { name: match.name, frames, instructions: match.instructions ?? [] };
  map[ourId] = entry;
  writeJson(MAP, map);
  return { available: true, ...entry };
}

function framesExist(ourId: string, n: number): boolean {
  for (let i = 0; i < n; i++) if (!existsSync(framePath(ourId, i))) return false;
  return n > 0;
}
function framePath(ourId: string, i: number): string {
  return path.join(DIR, ourId, `${i}.jpg`);
}

async function downloadFrames(ourId: string, images: string[]): Promise<number> {
  mkdirSync(path.join(DIR, ourId), { recursive: true });
  let count = 0;
  for (let i = 0; i < images.length; i++) {
    const res = await fetchWithTimeout(`${CDN}/exercises/${images[i]}`, 12000);
    if (!res || !res.ok) continue;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) continue;
    writeFileSync(framePath(ourId, i), Buffer.from(await res.arrayBuffer()));
    count++;
  }
  return count;
}

export function getFrame(ourId: string, i: number): Buffer | null {
  const fp = framePath(ourId, i);
  return existsSync(fp) ? readFileSync(fp) : null;
}
