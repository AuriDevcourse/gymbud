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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Client fetch helper: returns parsed JSON or throws the server's message.
 * Read requests (GET) retry a couple of times on transient failures (network
 * blip, 429, or a 5xx from a cold serverless/DB) so a flaky moment doesn't
 * surface as a "Failed to fetch" banner mid-workout.
 */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const canRetry = method === "GET";
  const maxAttempts = canRetry ? 3 : 1;

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
      if (!res.ok) {
        // transient server-side states are worth another try on reads
        if (canRetry && (res.status >= 500 || res.status === 429) && attempt < maxAttempts) {
          await sleep(attempt * 400);
          continue;
        }
        const text = await res.text();
        const data = text ? safeParse(text) : null;
        throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
      }
      const text = await res.text();
      return (text ? JSON.parse(text) : null) as T;
    } catch (e) {
      lastErr = e as Error;
      // a rejected fetch is a network error — retry reads, else surface it
      const isNetwork = e instanceof TypeError;
      if (canRetry && isNetwork && attempt < maxAttempts) {
        await sleep(attempt * 400);
        continue;
      }
      throw new Error(
        isNetwork ? "Couldn't reach the server. Check your connection." : lastErr.message,
      );
    }
  }
  throw lastErr ?? new Error("Request failed.");
}

function safeParse(text: string): { error?: { message?: string } } | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
