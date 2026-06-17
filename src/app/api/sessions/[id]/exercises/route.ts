import { addExerciseSchema, fail, intParam, knownExercise, ok, readBody } from "@/lib/api";
import { addExercise, getSession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid session id.");
  if (!getSession(id)) return fail(404, "not_found", "Session not found.");

  const body = await readBody(req, addExerciseSchema);
  if ("error" in body) return body.error;
  if (!knownExercise(body.data.exerciseId)) {
    return fail(422, "unknown_exercise", "Unknown exercise.");
  }
  return ok(addExercise(id, body.data.exerciseId), 201);
}
