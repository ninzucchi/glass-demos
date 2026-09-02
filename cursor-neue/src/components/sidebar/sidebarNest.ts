/** Row horizontal pad (`px-1.5`). */
export const SIDEBAR_ROW_PAD_X = 6;
/** Leading icon slot (folder, project, or agent dot). */
export const SIDEBAR_LEADING = 20;
/**
 * One nest step. Equals the leading slot so a child icon lines up with the
 * parent label, and every level uses the same step.
 *
 * Apply as extra `padding-left` on the row. Do not insert a spacer sibling
 * before the leading icon: `gap-1.5` then adds 6px only on the first nest,
 * so the third level looks tighter. That is the regression.
 */
export const SIDEBAR_NEST_STEP = 20;

export function sidebarNestLevel(nestLevel?: number, nested?: boolean): number {
  return nestLevel ?? (nested ? 1 : 0);
}

export function sidebarNestPad(level: number): number {
  return level * SIDEBAR_NEST_STEP;
}

/** X of a parent icon center, for a threadline under that icon. */
export function sidebarThreadlineLeft(parentLevel: number): number {
  return SIDEBAR_ROW_PAD_X + sidebarNestPad(parentLevel) + SIDEBAR_LEADING / 2;
}
