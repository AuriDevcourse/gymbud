import { ProgressClient } from "@/components/progress-client";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import {
  getProfile,
  listBodyWeight,
  listRuns,
  listSessions,
  loggedExerciseIds,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [ids, bodyweight, sessions, runs, profile] = await Promise.all([
    loggedExerciseIds(),
    listBodyWeight(),
    listSessions(),
    listRuns(),
    getProfile(),
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
    />
  );
}
