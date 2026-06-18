import { fail, intParam, ok } from "@/lib/api";
import { deleteSet } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid id.");
  await deleteSet(id);
  return ok({ deleted: true });
}
