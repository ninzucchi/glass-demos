import type { CSSProperties } from "react";
import type { DropZone } from "@/types";
import { useTabDragStore } from "@/store/tabDrag";

// Where the highlight sits for each drop zone: a merge fills the whole tile, a
// split fills the half the new pane will occupy.
const ZONE_INSET: Record<DropZone, CSSProperties> = {
  tab: { inset: 0 },
  right: { top: 0, bottom: 0, right: 0, left: "50%" },
  down: { left: 0, right: 0, bottom: 0, top: "50%" },
};

/** Drop preview shown over a tile while a tab is dragged onto it. Highlights the
 *  region the dropped tab will occupy (merge into tab bar, split right, or split
 *  down). Purely visual: hit-testing + the move are driven from TabHandle, so
 *  this stays pointer-events-none and never blocks the cursor. */
export function TileDropZone({ tileId }: { tileId: string }) {
  // Primitive selector: this tile only re-renders when ITS preview zone changes.
  // Slotted tab drops (index set) preview as the tab bar's insertion caret
  // instead of the whole-tile fill.
  const zone = useTabDragStore((s) =>
    s.target?.scope === "tile" && s.target.tileId === tileId && s.target.index === undefined
      ? s.target.zone
      : null,
  );
  if (!zone) return null;

  return (
    <div
      className="pointer-events-none absolute z-30 p-1.5 transition-all duration-slow"
      style={ZONE_INSET[zone]}
    >
      {/* Accent ramp tokens: a translucent bg-accent fill under a crisp
          border-accent outline. */}
      <div className="dropzone-fill h-full w-full rounded-[10px] border-[1.5px] border-accent" />
    </div>
  );
}
