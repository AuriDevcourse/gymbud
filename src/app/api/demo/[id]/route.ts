import { fail, ok } from "@/lib/api";
import { getDemoMeta } from "@/lib/demos";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";

export const dynamic = "force-dynamic";

// Metadata: whether a demo exists, how many frames, and written instructions.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!EXERCISES_BY_ID[id]) return fail(404, "not_found", "Unknown exercise.");
  return ok(await getDemoMeta(id));
}
