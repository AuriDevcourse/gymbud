// "How strong do you feel today?" — a light readiness check on returning to the
// app, used to nudge the day's suggested weights up or down a touch. Stored in
// localStorage (client-only), never on the server: it's a same-day hint, not data.

export type Readiness = "drained" | "okay" | "strong";

export const READINESS_LABELS: Record<Readiness, { label: string; emoji: string }> = {
  drained: { label: "Drained", emoji: "😴" },
  okay: { label: "Okay", emoji: "😐" },
  strong: { label: "Strong", emoji: "🔥" },
};

// How much each mood shifts the suggested load. Small on purpose — a nudge.
const FACTOR: Record<Readiness, number> = { drained: 0.95, okay: 1, strong: 1.03 };

const KEY = "gymbud:readiness";
const ACTIVE_MS = 8 * 60 * 60 * 1000; // a mood is only "today's" for ~8 hours

interface Stored {
  value: Readiness;
  ts: number;
}

export function setReadiness(value: Readiness): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}

export function readReadiness(): Readiness | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (Date.now() - s.ts > ACTIVE_MS) return null;
    return s.value;
  } catch {
    return null;
  }
}

/** Multiplier to apply to a suggested weight (1.0 when no fresh reading). */
export function readinessFactor(): number {
  const r = readReadiness();
  return r ? FACTOR[r] : 1;
}
