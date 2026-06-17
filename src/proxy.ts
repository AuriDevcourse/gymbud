import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authEnabled, tokenValid } from "@/lib/auth";
import { isLimited } from "@/lib/ratelimit";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

const PUBLIC = new Set(["/login", "/api/login", "/api/logout", "/api/health"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = clientIp(req);

  // 1) Rate limiting on the API surface (login is stricter)
  if (pathname.startsWith("/api")) {
    const kind = pathname === "/api/login" ? "login" : "api";
    if (await isLimited(kind, ip)) return tooMany();
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
    { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } },
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.png|favicon.ico|icon-192.png|icon-512.png|icon-maskable.png|apple-icon.png|logo.svg|logo-wordmark.svg|manifest.webmanifest).*)",
  ],
};
