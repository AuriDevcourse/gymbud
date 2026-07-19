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

export function dayLabel(s: string): string {
  const d = parseDbDate(s);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Midnight (local) of a date, as an epoch ms. Used to count CALENDAR days
// between two instants, not elapsed hours.
function localDayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Whole calendar days between a stored date and now, in local time. A workout
// last night is "1" this morning (Yesterday), not "0" until 24h have elapsed.
export function calendarDaysAgo(s: string): number {
  const diff = localDayStart(new Date()) - localDayStart(parseDbDate(s));
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
