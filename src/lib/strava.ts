import { getDb } from "./db";
import type { RunKind } from "./types";

// Strava sync: OAuth once from Settings, then "Sync now" pulls your recent
// Strava runs into the run log (deduped by activity id). Needs a free Strava
// API app — set STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET and you're live.
// (Apple Health has no web API, so watch/phone runs reach us via Strava.)

const AUTH_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

export function stravaConfigured(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export function stravaAuthUrl(origin: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: `${origin}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
  });
  return `${AUTH_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { firstname?: string; lastname?: string };
}

async function saveTokens(t: TokenResponse, athlete?: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO strava_auth (id, access_token, refresh_token, expires_at, athlete)
          VALUES (1, ?, ?, ?, COALESCE(?, (SELECT athlete FROM strava_auth WHERE id = 1), ''))
          ON CONFLICT(id) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            expires_at = excluded.expires_at,
            athlete = CASE WHEN excluded.athlete != '' THEN excluded.athlete ELSE strava_auth.athlete END`,
    args: [t.access_token, t.refresh_token, t.expires_at, athlete ?? ""],
  });
}

export async function stravaStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  athlete: string;
}> {
  if (!stravaConfigured()) return { configured: false, connected: false, athlete: "" };
  const db = await getDb();
  const row = (await db.execute("SELECT athlete FROM strava_auth WHERE id = 1")).rows[0];
  return { configured: true, connected: Boolean(row), athlete: row ? String(row.athlete) : "" };
}

export async function stravaDisconnect(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM strava_auth WHERE id = 1");
}

export async function stravaExchangeCode(code: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed (${res.status}).`);
  const t = (await res.json()) as TokenResponse;
  const athlete = [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(" ");
  await saveTokens(t, athlete);
}

async function validToken(): Promise<string | null> {
  const db = await getDb();
  const row = (
    await db.execute("SELECT access_token, refresh_token, expires_at FROM strava_auth WHERE id = 1")
  ).rows[0];
  if (!row) return null;
  // refresh a bit early so a token can't expire mid-sync
  if (Number(row.expires_at) > Date.now() / 1000 + 120) return String(row.access_token);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: String(row.refresh_token),
    }),
  });
  if (!res.ok) return null; // token revoked on Strava's side — reconnect from Settings
  const t = (await res.json()) as TokenResponse;
  await saveTokens(t);
  return t.access_token;
}

interface StravaActivity {
  id: number;
  type: string; // "Run", "Ride", ...
  distance: number; // metres
  moving_time: number; // seconds
  start_date_local: string; // ISO
  workout_type?: number | null; // runs: 0 default · 1 race · 2 long run · 3 workout
  name?: string;
}

function kindOf(a: StravaActivity): RunKind {
  if (a.workout_type === 3) return "interval";
  if (a.workout_type === 2) return "long";
  return a.distance >= 7000 ? "long" : "short";
}

/** Pull recent Strava runs into the run table. Returns how many were new. */
export async function stravaSync(): Promise<{ imported: number; scanned: number }> {
  const token = await validToken();
  if (!token) throw new Error("Strava not connected.");
  const res = await fetch(`${ACTIVITIES_URL}?per_page=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Strava activities fetch failed (${res.status}).`);
  const activities = (await res.json()) as StravaActivity[];
  const runs = activities.filter((a) => ["Run", "TrailRun", "VirtualRun"].includes(a.type));

  const db = await getDb();
  let imported = 0;
  for (const a of runs) {
    if (!a.moving_time || a.moving_time <= 0) continue;
    // INSERT OR IGNORE + unique strava_id index = safe to re-sync any time
    const r = await db.execute({
      sql: `INSERT OR IGNORE INTO run (distance, duration, kind, logged_at, note, strava_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        Math.round((a.distance / 1000) * 100) / 100,
        a.moving_time,
        kindOf(a),
        a.start_date_local.slice(0, 10),
        a.name ? `Strava: ${a.name}` : "Strava import",
        String(a.id),
      ],
    });
    imported += Number(r.rowsAffected ?? 0);
  }
  return { imported, scanned: runs.length };
}
