// SQLite datetime('now') gives "YYYY-MM-DD HH:MM:SS" in UTC.
// Normalize to a real Date (works on server and client).
export function parseDbDate(s: string): Date {
  // already ISO (e.g. bodyweight "YYYY-MM-DD") or full datetime
  if (s.includes("T")) return new Date(s);
  if (s.length === 10) return new Date(s + "T00:00:00");
  return new Date(s.replace(" ", "T") + "Z");
}

// Single-user app: calendar days must be the user's, not the server's (Vercel
// runs UTC), so day bucketing is pinned to this timezone on both sides.
export const APP_TZ = "Europe/Copenhagen";

// Calendar day of an instant in APP_TZ, as YYYY-MM-DD (en-CA gives that format).
export function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(d);
}

export function todayISO(): string {
  return dayKey(new Date());
}

// Short chart tick ("5 Jan"), pinned to APP_TZ so SSR and the client agree on
// which day a near-midnight session lands on.
const labelFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TZ,
  day: "numeric",
  month: "short",
});
export function dayLabel(s: string): string {
  return labelFmt.format(parseDbDate(s));
}

// Whole calendar days between a stored date and now, in APP_TZ (dayKey strings
// parse as UTC midnights, so the diff is exact days). A workout last night is
// "1" this morning (Yesterday), not "0" until 24h have elapsed.
export function calendarDaysAgo(s: string): number {
  const diff = Date.parse(dayKey(new Date())) - Date.parse(dayKey(parseDbDate(s)));
  return Math.round(diff / 86_400_000);
}

export function relativeDay(s: string): string {
  const days = calendarDaysAgo(s);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} mo ago`;
}
