import { createHmac, timingSafeEqual } from "node:crypto";

// Optional single-passcode gate. OFF unless APP_PASSCODE is set, so local dev
// and a trusted network stay login-free. Set it for any public deploy.
export const SESSION_COOKIE = "gc_session";

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSCODE && process.env.APP_PASSCODE.length >= 4);
}

/** Deterministic, non-reversible token derived from the passcode. */
export function expectedToken(): string {
  const secret = process.env.APP_PASSCODE ?? "";
  return createHmac("sha256", secret).update("gym-coach-session-v1").digest("hex");
}

export function tokenValid(token: string | undefined): boolean {
  if (!authEnabled() || !token) return false;
  const expected = expectedToken();
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Constant-time passcode check (fails closed if not configured). */
export function passcodeValid(input: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
