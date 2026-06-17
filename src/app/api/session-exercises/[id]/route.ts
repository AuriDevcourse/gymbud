import { fail, intParam, knownExercise, ok, readBody, swapSchema } from "@/lib/api";
import { removeExercise, sessionExerciseOwner, swapExercise } from "@/lib/store";

export const dynamic = "force-dynamic";

// Swap the movement (e.g. machine is taken).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid id.");
  if (sessionExerciseOwner(id) === null) return fail(404, "not_found", "Not found.");

  const body = await readBody(req, swapSchema);
  if ("error" in body) return body.error;
  if (!knownExercise(body.data.swapTo)) {
    return fail(422, "unknown_exercise", "Unknown exercise.");
  }
  swapExercise(id, body.data.swapTo);
  return ok({ swapped: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid id.");
  removeExercise(id);
  return ok({ deleted: true });
}
