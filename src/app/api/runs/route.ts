import { fail, ok, readBody, runSchema } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { addRun, getSession, listRuns, runsForSession } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/runs            → recent runs
// GET /api/runs?session=ID → cardio attached to one workout session
export async function GET(req: Request) {
  const sessionParam = new URL(req.url).searchParams.get("session");
  if (sessionParam !== null) {
    const sessionId = Number(sessionParam);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return fail(400, "bad_session", "Invalid session id.");
    }
    return ok(await runsForSession(sessionId));
  }
  return ok(await listRuns());
}

export async function POST(req: Request) {
  const body = await readBody(req, runSchema);
  if ("error" in body) return body.error;
  const { distance, duration, kind, loggedAt, note, sessionId } = body.data;
  if (sessionId !== undefined && !(await getSession(sessionId))) {
    return fail(404, "not_found", "Session not found.");
  }
  const entry = await addRun(
    distance ?? 0,
    duration,
    kind ?? "long",
    loggedAt ?? todayISO(),
    note ?? null,
    sessionId ?? null,
  );
  return ok(entry, 201);
}
