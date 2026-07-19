import { ok } from "@/lib/api";
import { stravaDisconnect, stravaStatus } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await stravaStatus());
}

export async function DELETE() {
  await stravaDisconnect();
  return ok({ disconnected: true });
}
