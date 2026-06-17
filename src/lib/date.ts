// SQLite datetime('now') gives "YYYY-MM-DD HH:MM:SS" in UTC.
// Normalize to a real Date (works on server and client).
export function parseDbDate(s: string): Date {
  // already ISO (e.g. bodyweight "YYYY-MM-DD") or full datetime
  if (s.includes("T")) return new Date(s);
  if (s.length === 10) return new Date(s + "T00:00:00");
  return new Date(s.replace(" ", "T") + "Z");
}

export function todayISO(): string {
  // local calendar day, YYYY-MM-DD
  const d = new Date();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

export function dayLabel(s: string): string {
  const d = parseDbDate(s);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function relativeDay(s: string): string {
  const then = parseDbDate(s).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} mo ago`;
}
