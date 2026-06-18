import type { NextConfig } from "next";

// Content Security Policy. 'unsafe-inline' is required for Next's hydration
// bootstrap script and Recharts' inline styles; everything else is locked to
// same-origin (this is a self-hosted, no-CDN app).
const dev = process.env.NODE_ENV === "development";

// In dev only, let the Agentation feedback toolbar reach its local sync server.
const connectSrc = dev
  ? "connect-src 'self' http://localhost:4747 ws://localhost:4747"
  : "connect-src 'self'";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://cdn.jsdelivr.net",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  connectSrc,
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Security headers on every route (SECURITY.md rules 13)
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
