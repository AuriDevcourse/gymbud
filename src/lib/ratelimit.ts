import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Distributed rate limiting via Upstash when configured (required on Vercel —
// serverless instances don't share memory). Falls back to a per-process
// in-memory limiter locally / when Upstash env is absent.

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

let apiLimiter: Ratelimit | null = null;
let loginLimiter: Ratelimit | null = null;

if (hasUpstash) {
  const redis = Redis.fromEnv();
  apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(240, "60 s"),
    prefix: "gb:api",
  });
  loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "900 s"),
    prefix: "gb:login",
  });
}

// in-memory fallback
const hits = new Map<string, number[]>();
function memLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t > windowMs)) hits.delete(k);
  }
  return arr.length > max;
}

/** Returns true if the request should be blocked (429). */
export async function isLimited(kind: "api" | "login", ip: string): Promise<boolean> {
  if (kind === "login") {
    if (loginLimiter) return !(await loginLimiter.limit(`l:${ip}`)).success;
    return memLimited(`login:${ip}`, 5, 900_000);
  }
  if (apiLimiter) return !(await apiLimiter.limit(`a:${ip}`)).success;
  return memLimited(`api:${ip}`, 240, 60_000);
}
