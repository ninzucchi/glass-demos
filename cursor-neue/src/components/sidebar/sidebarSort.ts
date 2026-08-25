/** Geometry of a sortable sidebar list, captured at drag start. */
export interface SortMetrics {
  ids: string[];
  tops: number[];
  heights: number[];
}

/** Slot whose midpoint the pointer has not yet passed. Last item if below all. */
export function sortInsertionIndex(y: number, tops: number[], heights: number[]): number {
  for (let i = 0; i < tops.length; i++) {
    if (y < tops[i] + heights[i] / 2) return i;
  }
  return Math.max(0, tops.length - 1);
}

/** Insert-before index, including `length` for “after the last item”. */
export function sortInsertIndex(y: number, tops: number[], heights: number[]): number {
  for (let i = 0; i < tops.length; i++) {
    if (y < tops[i] + heights[i] / 2) return i;
  }
  return tops.length;
}

export function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Pixel shift so each item sits where it would after a move from `from` to `to`. */
export function sortBlockShifts(
  metrics: SortMetrics,
  from: number,
  to: number,
): Record<string, number> {
  const { ids, tops, heights } = metrics;
  const shifts: Record<string, number> = {};
  for (const id of ids) shifts[id] = 0;
  if (from < 0 || from === to || ids.length === 0) return shifts;
  const gap = ids.length > 1 ? tops[1] - tops[0] - heights[0] : 0;
  const preview = arrayMove(ids, from, to);
  const previewTop: Record<string, number> = {};
  let y = tops[0];
  for (const id of preview) {
    previewTop[id] = y;
    y += heights[ids.indexOf(id)] + gap;
  }
  for (let i = 0; i < ids.length; i++) {
    shifts[ids[i]] = previewTop[ids[i]] - tops[i];
  }
  return shifts;
}

/** Shift items at `insertAt` and after down to open a gap for an incoming row. */
export function sortInsertShifts(
  metrics: SortMetrics,
  insertAt: number,
  insertHeight: number,
): Record<string, number> {
  const { ids, tops, heights } = metrics;
  const shifts: Record<string, number> = {};
  for (const id of ids) shifts[id] = 0;
  if (ids.length === 0) return shifts;
  const gap = ids.length > 1 ? tops[1] - tops[0] - heights[0] : 4;
  const delta = insertHeight + gap;
  for (let i = 0; i < ids.length; i++) {
    if (i >= insertAt) shifts[ids[i]] = delta;
  }
  return shifts;
}
