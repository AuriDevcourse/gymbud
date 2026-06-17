import type { Unit } from "./types";

/** Show up to 2 decimals, no trailing zeros (80 -> "80", 77.5 -> "77.5", 21.25 -> "21.25"). */
export function fmtWeight(w: number, unit?: Unit): string {
  const n = String(parseFloat(w.toFixed(2)));
  return unit ? `${n}${unit}` : n;
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
