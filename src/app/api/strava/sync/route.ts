import { fail, ok } from "@/lib/api";
import { stravaSync } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return ok(await stravaSync());
  } catch (e) {
    return fail(502, "strava_sync_failed", (e as Error).message);
  }
}
