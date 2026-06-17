import { fail, finishSchema, intParam, ok, readBody } from "@/lib/api";
import {
  deleteSession,
  finishSession,
  getSession,
  updateSessionNote,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid session id.");
  const s = getSession(id);
  if (!s) return fail(404, "not_found", "Session not found.");
  return ok(s);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid session id.");
  if (!getSession(id)) return fail(404, "not_found", "Session not found.");

  const body = await readBody(req, finishSchema);
  if ("error" in body) return body.error;

  if (body.data.finish) {
    return ok(finishSession(id, body.data.note ?? null));
  }
  if (body.data.note !== undefined) {
    updateSessionNote(id, body.data.note);
  }
  return ok(getSession(id));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid session id.");
  deleteSession(id);
  return ok({ deleted: true });
}
