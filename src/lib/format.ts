import type { Unit } from "./types";

/** Show up to 2 decimals, no trailing zeros (80 -> "80", 77.5 -> "77.5", 21.25 -> "21.25"). */
export function fmtWeight(w: number, unit?: Unit): string {
  const n = String(parseFloat(w.toFixed(2)));
  return unit ? `${n}${unit}` : n;
}

/** Human duration from seconds: "45s", "32 min", "32m 10s", "1h 5m". */
export function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return sec ? `${m}m ${sec}s` : `${m} min`;
  return `${sec}s`;
}

/** Client fetch helper: returns parsed JSON or throws the server's message. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}
