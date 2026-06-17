import { fail, ok } from "@/lib/api";
import { recommendNext } from "@/lib/coach";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import { getProfile, lastPerformance } from "@/lib/store";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// "What you did last time" + today's target for this exercise.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!EXERCISES_BY_ID[id]) return fail(404, "not_found", "Unknown exercise.");

  const excludeParam = req.nextUrl.searchParams.get("session");
  const exclude = excludeParam ? Number(excludeParam) : undefined;

  const last = lastPerformance(id, exclude && exclude > 0 ? exclude : undefined);
  const profile = getProfile();

  // Today's target is derived from last time's WORKING sets vs the goal range.
  const target = recommendNext(
    (last?.sets ?? [])
      .filter((s) => s.type !== "warmup")
      .map((s) => ({ weight: s.weight, reps: s.reps })),
    [],
    profile.goal,
    profile.unit,
  );

  return ok({ last, target });
}
