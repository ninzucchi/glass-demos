import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { type Geo, MIN_W, MIN_H } from "@/components/desktop/geometry";
import { lockDragSelection } from "@/lib/dragGuard";

const TOP_STRIP = 36; // window chrome height; only drags starting here move the window
const INTERACTIVE =
  "button, input, textarea, select, a, [role='menuitem'], [data-no-drag], [data-panel-resize-handle-id]";

type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function clamp(g: Geo, b: DOMRect): Geo {
  const w = Math.max(MIN_W, Math.min(g.w, b.width));
  const h = Math.max(MIN_H, Math.min(g.h, b.height));
  const x = Math.max(0, Math.min(g.x, b.width - w));
  const y = Math.max(0, Math.min(g.y, b.height - h));
  return { x, y, w, h };
}

interface WindowFrameProps {
  geo: Geo;
  onChange: (geo: Geo) => void;
  bounds: () => DOMRect | null;
  onFocus?: () => void;
  zIndex?: number;
  /** Double-click the window's left edge to restore (un-maximize). The west
   *  resize handles overhang ~4px outside the border, so they sit exactly where
   *  a user aims when double-clicking "the edge" — the in-window restore zone
   *  (clipped by the shell) can't reach there. Wired only while maximized. */
  onEdgeRestore?: () => void;
  children: ReactNode;
}

export function WindowFrame({
  geo,
  onChange,
  bounds,
  onFocus,
  zIndex,
  onEdgeRestore,
  children,
}: WindowFrameProps) {
  const ref = useRef<HTMLDivElement>(null);

  const beginDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Primary (left) button only. Right/middle clicks must pass through so the
    // context menu works and a right-drag never moves the window.
    if (e.button !== 0) return;
    onFocus?.();
    const frame = ref.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    // Only from the top chrome strip, and not from an interactive control.
    if (e.clientY - rect.top > TOP_STRIP) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    e.preventDefault();
    const b = bounds();
    if (!b) return;
    const start = { px: e.clientX, py: e.clientY, ...geo };
    const release = lockDragSelection();
    const move = (ev: PointerEvent) => {
      onChange(
        clamp(
          { ...start, x: start.x + (ev.clientX - start.px), y: start.y + (ev.clientY - start.py) },
          b,
        ),
      );
    };
    const up = () => {
      release();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const beginResize = (dir: Dir) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // primary button only; don't swallow right-click
    e.preventDefault();
    e.stopPropagation();
    onFocus?.();
    const b = bounds();
    if (!b) return;
    const start = { px: e.clientX, py: e.clientY, ...geo };
    const release = lockDragSelection();
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.px;
      const dy = ev.clientY - start.py;
      let { x, y, w, h } = start;
      if (dir.includes("e")) w = start.w + dx;
      if (dir.includes("s")) h = start.h + dy;
      if (dir.includes("w")) {
        w = start.w - dx;
        x = start.x + dx;
      }
      if (dir.includes("n")) {
        h = start.h - dy;
        y = start.y + dy;
      }
      // Enforce min size, adjusting the anchored edge for n/w drags.
      if (w < MIN_W && dir.includes("w")) x = start.x + (start.w - MIN_W);
      if (h < MIN_H && dir.includes("n")) y = start.y + (start.h - MIN_H);
      onChange(clamp({ x, y, w, h }, b));
    };
    const up = () => {
      release();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const edge = "absolute z-20";
  const handles: { dir: Dir; cls: string; cursor: string }[] = [
    { dir: "n", cls: "left-2 right-2 -top-1 h-2", cursor: "ns-resize" },
    { dir: "s", cls: "left-2 right-2 -bottom-1 h-2", cursor: "ns-resize" },
    { dir: "e", cls: "top-2 bottom-2 -right-1 w-2", cursor: "ew-resize" },
    { dir: "w", cls: "top-2 bottom-2 -left-1 w-2", cursor: "ew-resize" },
    { dir: "ne", cls: "-top-1 -right-1 h-3 w-3", cursor: "nesw-resize" },
    { dir: "nw", cls: "-top-1 -left-1 h-3 w-3", cursor: "nwse-resize" },
    { dir: "se", cls: "-bottom-1 -right-1 h-3 w-3", cursor: "nwse-resize" },
    { dir: "sw", cls: "-bottom-1 -left-1 h-3 w-3", cursor: "nesw-resize" },
  ];

  return (
    <div
      ref={ref}
      data-window-frame=""
      // Any interaction raises the window above its siblings (runs before child
      // handlers via capture, so it works for clicks on the content too).
      onPointerDownCapture={() => onFocus?.()}
      onPointerDown={beginDrag}
      className="absolute"
      style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h, zIndex }}
    >
      {children}
      {handles.map((h) => (
        <div
          key={h.dir}
          data-no-drag=""
          onPointerDown={beginResize(h.dir)}
          // West-side handles (w/nw/sw) overhang the left border, so double-
          // clicking them restores when maximized — covering the dead strip the
          // in-window restore zone can't reach. Resize-on-drag is unaffected
          // (a clean double-click never moves the pointer).
          onDoubleClick={onEdgeRestore && h.dir.includes("w") ? onEdgeRestore : undefined}
          className={`${edge} ${h.cls}`}
          style={{ cursor: h.cursor }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
