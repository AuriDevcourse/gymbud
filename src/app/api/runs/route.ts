import { ok, readBody, runSchema } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { addRun, listRuns } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listRuns());
}

export async function POST(req: Request) {
  const body = await readBody(req, runSchema);
  if ("error" in body) return body.error;
  const { distance, duration, kind, loggedAt, note } = body.data;
  const entry = await addRun(distance, duration, kind ?? "long", loggedAt ?? todayISO(), note ?? null);
  return ok(entry, 201);
}
