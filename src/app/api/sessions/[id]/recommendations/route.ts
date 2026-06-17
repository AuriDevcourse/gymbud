import { fail, intParam, ok } from "@/lib/api";
import { recommendNext } from "@/lib/coach";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import { getProfile, getSession, lastPerformance } from "@/lib/store";

export const dynamic = "force-dynamic";

// Per-exercise "what to do next session", comparing this session to last time.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = intParam((await params).id);
  if (!id) return fail(400, "bad_id", "Invalid session id.");
  const session = await getSession(id);
  if (!session) return fail(404, "not_found", "Session not found.");

  const profile = await getProfile();
  const working = (sets: { weight: number; reps: number; type: string }[]) =>
    sets.filter((s) => s.type !== "warmup").map((s) => ({ weight: s.weight, reps: s.reps }));

  const recs = await Promise.all(
    session.exercises.map(async (se) => {
      const last = await lastPerformance(se.exerciseId, id);
      const rec = recommendNext(
        working(se.sets),
        working(last?.sets ?? []),
        profile.goal,
        profile.unit,
      );
      return {
        exerciseId: se.exerciseId,
        name: EXERCISES_BY_ID[se.exerciseId]?.name ?? se.exerciseId,
        recommendation: rec,
      };
    }),
  );

  return ok({ sessionId: id, recommendations: recs });
}
