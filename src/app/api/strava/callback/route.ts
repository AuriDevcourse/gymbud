import { stravaExchangeCode } from "@/lib/strava";

export const dynamic = "force-dynamic";

// Strava redirects here after consent. Trade the code for tokens, then land
// back on Settings with a status flag the UI can toast.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const settings = new URL("/settings", url.origin);
  if (!code || url.searchParams.get("error")) {
    settings.searchParams.set("strava", "denied");
    return Response.redirect(settings, 302);
  }
  try {
    await stravaExchangeCode(code);
    settings.searchParams.set("strava", "connected");
  } catch {
    settings.searchParams.set("strava", "error");
  }
  return Response.redirect(settings, 302);
}
