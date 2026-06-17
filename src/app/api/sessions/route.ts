import { ok } from "@/lib/api";
import { activeSession, createSession, listSessions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listSessions());
}

// Start a session. If one is already open, return it instead of opening another.
export async function POST() {
  const open = await activeSession();
  if (open) return ok(open, 200);
  return ok(await createSession(), 201);
}
