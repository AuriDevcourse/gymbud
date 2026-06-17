import { fail, intParam, ok, readBody, setSchema } from "@/lib/api";
import { deleteSet, updateSet } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid id.");
  const body = await readBody(req, setSchema);
  if ("error" in body) return body.error;
  updateSet(id, body.data.weight, body.data.reps, body.data.type ?? "normal");
  return ok({ updated: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid id.");
  deleteSet(id);
  return ok({ deleted: true });
}
