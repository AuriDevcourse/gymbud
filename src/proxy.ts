import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authEnabled, tokenValid } from "@/lib/auth";

// In-memory rate limiter. Fine here because this self-hosts as a SINGLE Node
// process (SECURITY.md rule 1 / rule 8). On serverless this would NOT work.
const hits = new Map<string, number[]>();

function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

// Opportunistic cleanup so the map can't grow unbounded.
function sweep() {
  if (hits.size < 5000) return;
  const now = Date.now();
  for (const [k, v] of hits) {
    if (v.every((t) => now - t > 900_000)) hits.delete(k);
  }
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

const PUBLIC = new Set(["/login", "/api/login", "/api/logout", "/api/health"]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = clientIp(req);
  sweep();

  // 1) Rate limiting on the API surface
  if (pathname.startsWith("/api")) {
    // Auth endpoint is brute-force sensitive: 5 / 15 min (SECURITY.md rule 1)
    if (pathname === "/api/login") {
      if (rateLimited(`login:${ip}`, 5, 900_000)) {
        return tooMany();
      }
    } else if (rateLimited(`api:${ip}`, 240, 60_000)) {
      // generous for a single user logging sets; blocks runaway loops
      return tooMany();
    }
  }

  // 2) Optional passcode gate
  if (authEnabled() && !PUBLIC.has(pathname)) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!tokenValid(token)) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: { code: "unauthorized", message: "Locked. Sign in." } },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

function tooMany() {
  return NextResponse.json(
    { error: { code: "rate_limited", message: "Too many requests. Slow down." } },
    {
      status: 429,
      headers: { "Retry-After": "60", "Cache-Control": "no-store" },
    },
  );
}

export const config = {
  matcher: [
    // everything except Next internals and static assets
    "/((?!_next/static|_next/image|favicon.png|favicon.ico|icon-192.png|icon-512.png|icon-maskable.png|apple-icon.png|manifest.webmanifest).*)",
  ],
};
