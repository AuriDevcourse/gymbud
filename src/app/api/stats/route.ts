import { ok } from "@/lib/api";
import { workoutStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await workoutStats());
}
