import { fail, ok } from "@/lib/api";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import { exerciseHistory } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ exerciseId: string }> },
) {
  const { exerciseId } = await params;
  if (!EXERCISES_BY_ID[exerciseId]) return fail(404, "not_found", "Unknown exercise.");
  return ok({
    exercise: EXERCISES_BY_ID[exerciseId],
    points: await exerciseHistory(exerciseId),
  });
}
