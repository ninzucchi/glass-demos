// Window geometry shared by the desktop frame and the store (which spawns
// detached windows). Kept free of React so the store can import it.

export interface Geo {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MIN_W = 720;
export const MIN_H = 480;

/** Default demo window size (also the snap target for reset / center shot). */
export const DEFAULT_W = 1280;
export const DEFAULT_H = 832;

/** Fixed output size for the "Center" screenshot (MacBook 14" logical frame). */
export const CENTER_SHOT_W = 1512;
export const CENTER_SHOT_H = 982;

export interface SizePreset {
  id: string;
  label: string;
  w: number;
  h: number;
}

/** Quick window sizes: uniform scales of the DEFAULT_W × DEFAULT_H base, so
 *  every preset holds the base aspect ratio and shots stay comparable across
 *  sizes. Fixed pixel sizes (not viewport-relative) so a given preset is
 *  identical on any screen; ones larger than the desktop are offered disabled
 *  rather than clamped, so picking one always lands on the exact dimensions.
 *  Scales below 0.75 are omitted — they'd fall under MIN_W / MIN_H. */
export const SIZE_PRESETS: SizePreset[] = [0.75, 1, 1.25, 1.5, 2].map((scale) => ({
  id: String(scale),
  label: scale === 1 ? "Base" : `${scale}×`,
  w: DEFAULT_W * scale,
  h: DEFAULT_H * scale,
}));

// Horizontal space the dock occupies at the desktop's left edge: it sits 6px in
// (`left-1.5`) and its bar is a 44px tile (`size-11`) with 16px padding on each
// side (`p-4`) → 6 + 16 + 44 + 16. Only "fit to screen" insets for it; centered
// windows ignore it, which is why the dock lives on the left — a bottom dock
// would force a vertical bias and break true centering.
export const DOCK_RESERVE = 82;

// Each pointer-less spawn steps the window down-right so stacked windows don't
// land exactly on top of one another.
let cascade = 0;

/** The desktop's live rect, or null before it's mounted/measured. */
function desktopRect(): DOMRect | null {
  return (
    document.querySelector("[data-desktop]") as HTMLElement | null
  )?.getBoundingClientRect() ?? null;
}

/** The desktop's size, or null before it's measured. */
export function desktopSize(): { w: number; h: number } | null {
  const desk = desktopRect();
  return desk ? { w: desk.width, h: desk.height } : null;
}

/** Geometry for a freshly spawned detached window, relative to the desktop. When
 *  a pointer is given (drag-out), the window opens centered under the cursor;
 *  otherwise it cascades from the desktop center (menu "Open in New Window"). */
export function newWindowGeo(pointer?: { x: number; y: number }): Geo {
  const desk = desktopRect();
  const left = desk?.left ?? 0;
  const top = desk?.top ?? 0;
  const bw = desk?.width ?? window.innerWidth;
  const bh = desk?.height ?? window.innerHeight;

  const w = Math.max(MIN_W, Math.min(DEFAULT_W, bw - 32));
  const h = Math.max(MIN_H, Math.min(DEFAULT_H, bh - 32));

  let x: number;
  let y: number;
  if (pointer) {
    // Open so the cursor sits in the title strip, roughly centered horizontally.
    x = pointer.x - left - w / 2;
    y = pointer.y - top - 18;
  } else {
    const offset = (cascade % 5) * 28;
    cascade += 1;
    const center = centerOnDesktop(bw, bh, w, h);
    x = center.x + offset;
    y = center.y + offset;
  }

  return {
    w,
    h,
    x: Math.max(0, Math.min(x, bw - w)),
    y: Math.max(0, Math.min(y, bh - h)),
  };
}

/** Geometry that fills the desktop (the user's actual browser viewport area)
 *  minus `padding` on every side, plus the dock's reserved width on the left so
 *  the fitted window clears the dock instead of sitting behind it. Used by the
 *  "Fit window to screen" setting to snap a demo window to the surrounding
 *  window. Returns null before the desktop is measured. */
export function fitToDesktopGeo(padding = 32): Geo | null {
  const desk = desktopRect();
  if (!desk) return null;
  return {
    x: padding + DOCK_RESERVE,
    y: padding,
    w: Math.max(MIN_W, desk.width - padding * 2 - DOCK_RESERVE),
    h: Math.max(MIN_H, desk.height - padding * 2),
  };
}

/** Centered position for a w×h window on a deskW×deskH desktop. True center on
 *  both axes: the dock sits on the left edge, clear of the centered window. */
export function centerOnDesktop(
  deskW: number,
  deskH: number,
  w: number,
  h: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, (deskW - w) / 2),
    y: Math.max(0, (deskH - h) / 2),
  };
}

/** Centered DEFAULT_W×DEFAULT_H window. Shared by the initial main-window
 *  placement, Reset demo, and the Center screenshot snap. Returns null before
 *  the desktop is measured. */
export function centeredWindowGeo(): Geo | null {
  const desk = desktopRect();
  if (!desk) return null;
  const w = Math.max(MIN_W, Math.min(DEFAULT_W, desk.width - 32));
  const h = Math.max(MIN_H, Math.min(DEFAULT_H, desk.height - 32));
  return { w, h, ...centerOnDesktop(desk.width, desk.height, w, h) };
}

/** Resize `geo` to w×h about its own center, nudged back inside the desktop if
 *  that would push it off an edge. Holding the center (rather than re-centering
 *  on the desktop) keeps a window the user has placed roughly where they put
 *  it. Returns null before the desktop is measured. */
export function resizeAroundCenter(geo: Geo, w: number, h: number): Geo | null {
  const desk = desktopRect();
  if (!desk) return null;
  const cx = geo.x + geo.w / 2;
  const cy = geo.y + geo.h / 2;
  return {
    w,
    h,
    x: Math.max(0, Math.min(cx - w / 2, desk.width - w)),
    y: Math.max(0, Math.min(cy - h / 2, desk.height - h)),
  };
}

/** Topmost element at (x, y), skipping the transparent drag scrim that overlays
 *  the page during a pointer drag. The scrim absorbs hover so surfaces beneath
 *  the cursor don't light up while dragging, but drop hit-testing must still see
 *  the real element underneath it. */
export function topElementAt(x: number, y: number): HTMLElement | null {
  const stack = document.elementsFromPoint(x, y) as HTMLElement[];
  return stack.find((el) => !el.hasAttribute("data-drag-scrim")) ?? null;
}

/** True when (x, y) is over the desktop, outside every window frame: a drag
 *  released here tears the dragged item off into a new window. Shared by the
 *  tab drag (tear-off) and the workspace-row drag. */
export function isOutsideWindows(x: number, y: number): boolean {
  const el = topElementAt(x, y);
  return !el || !el.closest("[data-window-frame]");
}
