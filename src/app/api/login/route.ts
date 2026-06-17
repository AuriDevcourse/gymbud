import { cookies } from "next/headers";
import { z } from "zod";
import { fail, ok, readBody } from "@/lib/api";
import { SESSION_COOKIE, authEnabled, expectedToken, passcodeValid } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({ passcode: z.string().min(1).max(200) });

export async function POST(req: Request) {
  if (!authEnabled()) {
    return fail(400, "not_configured", "Passcode auth is not enabled on this server.");
  }
  const body = await readBody(req, schema);
  if ("error" in body) return body.error;

  if (!passcodeValid(body.data.passcode)) {
    // generic message — never reveal whether the passcode "exists"
    return fail(401, "unauthorized", "Wrong passcode.");
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return ok({ ok: true });
}
