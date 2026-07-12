import { ProgressClient } from "@/components/progress-client";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import {
  getProfile,
  listBodyWeight,
  listRuns,
  listSessions,
  loggedExerciseIds,
  progressSummary,
  topLifts,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [ids, bodyweight, sessions, runs, profile, lifts, summary] = await Promise.all([
    loggedExerciseIds(),
    listBodyWeight(),
    listSessions(),
    listRuns(),
    getProfile(),
    topLifts(6),
    progressSummary(),
  ]);
  const exercises = ids
    .map((id) => ({ id, name: EXERCISES_BY_ID[id]?.name ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ProgressClient
      exercises={exercises}
      bodyweight={bodyweight}
      sessions={sessions}
      runs={runs}
      unit={profile.unit}
      goal={profile.goal}
      topLifts={lifts}
      summary={summary}
    />
  );
}
