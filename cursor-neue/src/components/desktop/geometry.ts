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

/** Gap from a window to the desktop edge. Also the gap from a window to the
 *  left dock — same distance, measured from the dock's outer edge. */
export const EDGE_GAP = 16;

/** Fixed output size for the "Center" screenshot (MacBook 14" logical frame). */
export const CENTER_SHOT_W = 1512;
export const CENTER_SHOT_H = 982;

// Each pointer-less spawn steps the window down-right so stacked windows don't
// land exactly on top of one another.
let cascade = 0;

/** The desktop's live rect, or null before it's mounted/measured. */
function desktopRect(): DOMRect | null {
  return (
    document.querySelector("[data-desktop]") as HTMLElement | null
  )?.getBoundingClientRect() ?? null;
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

  const safe = safeDesktopBounds(bw, bh);
  const w = Math.max(MIN_W, Math.min(DEFAULT_W, safe.right - safe.left));
  const h = Math.max(MIN_H, Math.min(DEFAULT_H, safe.bottom - safe.top));

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
    x: clamp(x, safe.left, safe.right - w),
    y: clamp(y, safe.top, safe.bottom - h),
  };
}

/** Distance from the desktop's left edge to the dock bar's right edge. */
function dockExtent(): number {
  const desk = desktopRect();
  const dock = document.querySelector("[data-dock]") as HTMLElement | null;
  if (!desk || !dock) return 0;
  return Math.max(0, dock.getBoundingClientRect().right - desk.left);
}

/** Largest rect that keeps EDGE_GAP to the screen and to the left dock. */
function safeDesktopBounds(deskW: number, deskH: number): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  return {
    left: dockExtent() + EDGE_GAP,
    top: EDGE_GAP,
    right: deskW - EDGE_GAP,
    bottom: deskH - EDGE_GAP,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(n, max));
}

/** Centered position for a w×h window on a deskW×deskH desktop. True center on
 *  both axes. Callers that place a live window then clamp into `safeDesktopBounds`
 *  so the left dock keeps the same gap as the screen edge. */
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
 *  the desktop is measured. Width/x keep EDGE_GAP past the dock so the window
 *  never sits tighter to the dock than to the other screen edges. */
export function centeredWindowGeo(): Geo | null {
  const desk = desktopRect();
  if (!desk) return null;
  const safe = safeDesktopBounds(desk.width, desk.height);
  const w = Math.max(MIN_W, Math.min(DEFAULT_W, safe.right - safe.left));
  const h = Math.max(MIN_H, Math.min(DEFAULT_H, safe.bottom - safe.top));
  const center = centerOnDesktop(desk.width, desk.height, w, h);
  return {
    w,
    h,
    x: clamp(center.x, safe.left, safe.right - w),
    y: clamp(center.y, safe.top, safe.bottom - h),
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
