import { fail, intParam, knownExercise, ok, readBody, sessionExercisePatchSchema } from "@/lib/api";
import { removeExercise, sessionExerciseOwner, setDifficulty, swapExercise } from "@/lib/store";

export const dynamic = "force-dynamic";

// PATCH: swap the movement (machine taken) or rate how hard it was.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid id.");
  if ((await sessionExerciseOwner(id)) === null) return fail(404, "not_found", "Not found.");

  const body = await readBody(req, sessionExercisePatchSchema);
  if ("error" in body) return body.error;

  if (body.data.difficulty) {
    await setDifficulty(id, body.data.difficulty);
    return ok({ rated: true });
  }
  if (body.data.swapTo) {
    if (!knownExercise(body.data.swapTo)) {
      return fail(422, "unknown_exercise", "Unknown exercise.");
    }
    await swapExercise(id, body.data.swapTo);
    return ok({ swapped: true });
  }
  return fail(422, "invalid", "Nothing to update.");
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid id.");
  await removeExercise(id);
  return ok({ deleted: true });
}
