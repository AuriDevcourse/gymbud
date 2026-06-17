import { fail, intParam, ok, readBody, setSchema } from "@/lib/api";
import { addSet, sessionExerciseOwner } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid id.");
  if (sessionExerciseOwner(id) === null) return fail(404, "not_found", "Not found.");

  const body = await readBody(req, setSchema);
  if ("error" in body) return body.error;
  return ok(
    addSet(id, body.data.weight, body.data.reps, body.data.type ?? "normal"),
    201,
  );
}
