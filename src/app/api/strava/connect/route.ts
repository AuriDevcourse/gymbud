import { fail } from "@/lib/api";
import { stravaAuthUrl, stravaConfigured } from "@/lib/strava";

export const dynamic = "force-dynamic";

// Kick off the OAuth dance — browser lands on Strava's consent screen.
export async function GET(req: Request) {
  if (!stravaConfigured()) {
    return fail(503, "not_configured", "Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET first.");
  }
  return Response.redirect(stravaAuthUrl(new URL(req.url).origin), 302);
}
