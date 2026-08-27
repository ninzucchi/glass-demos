/** Short elapsed label for project cards: now, 2m, 5h, 3d, 1w. */
export function formatRelativeTime(at: number, now = Date.now()): string {
  const delta = Math.max(0, now - at);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (delta < minute) return "now";
  if (delta < hour) return `${Math.floor(delta / minute)}m`;
  if (delta < day) return `${Math.floor(delta / hour)}h`;
  if (delta < week) return `${Math.floor(delta / day)}d`;
  return `${Math.floor(delta / week)}w`;
}
