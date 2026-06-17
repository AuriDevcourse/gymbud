import { ProgressClient } from "@/components/progress-client";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import { getProfile, listBodyWeight, listSessions, loggedExerciseIds } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [ids, bodyweight, sessions, profile] = await Promise.all([
    loggedExerciseIds(),
    listBodyWeight(),
    listSessions(),
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
      unit={profile.unit}
    />
  );
}
