import { ProgressClient } from "@/components/progress-client";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import { getProfile, listBodyWeight, listSessions, loggedExerciseIds } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function ProgressPage() {
  const exercises = loggedExerciseIds()
    .map((id) => ({ id, name: EXERCISES_BY_ID[id]?.name ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ProgressClient
      exercises={exercises}
      bodyweight={listBodyWeight()}
      sessions={listSessions()}
      unit={getProfile().unit}
    />
  );
}
