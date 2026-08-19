import type { CSSProperties } from "react";
import type { SplitSide } from "@/types";
import { useTabDragStore } from "@/store/tabDrag";

// The full-span preview fills the half of the WHOLE content panel that the new
// root pane will occupy (right column / bottom row spanning every existing tile).
const SIDE_INSET: Record<SplitSide, CSSProperties> = {
  right: { top: 0, bottom: 0, right: 0, left: "50%" },
  down: { left: 0, right: 0, bottom: 0, top: "50%" },
};

/** Drop preview shown over the entire content panel when a tab is dragged onto
 *  its outer edge. Unlike `TileDropZone` (scoped to one tile), this highlight
 *  spans the full width/height to signal a layout-root split. Scoped to its
 *  panel via `windowId` + `scopeId` so only the targeted window shows the
 *  preview. Pointer-events none: hit-testing + the move are driven from TabHandle. */
export function RootDropZone({ windowId, scopeId }: { windowId: string; scopeId: string }) {
  const side = useTabDragStore((s) =>
    s.target?.scope === "root" && s.target.windowId === windowId && s.target.scopeId === scopeId
      ? s.target.side
      : null,
  );
  if (!side) return null;

  return (
    <div
      className="pointer-events-none absolute z-40 p-1.5 transition-all duration-slow"
      style={SIDE_INSET[side]}
    >
      <div className="dropzone-fill h-full w-full rounded-[10px] border-[1.5px] border-accent" />
    </div>
  );
}
