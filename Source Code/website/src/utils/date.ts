/**
 * Returns an ISO week number string like "Week 14, 2024" for a given date.
 */
export function getWeekNumber(d: Date): string {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `Week ${weekNo}, ${d.getUTCFullYear()}`;
}
