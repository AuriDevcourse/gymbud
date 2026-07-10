import { ok } from "@/lib/api";
import { progressSummary } from "@/lib/store";

export const dynamic = "force-dynamic";

// Returns the full progress summary (XP, level, badges, lifetime aggregates).
// Superset of the old WorkoutStats, so streak/totalWorkouts/thisWeekSets are here too.
export async function GET() {
  return ok(await progressSummary());
}
