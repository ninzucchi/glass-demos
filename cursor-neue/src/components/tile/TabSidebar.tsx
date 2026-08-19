import { useRef, useState } from "react";
import type { Tab, TileNode } from "@/types";
import { TAB_REGISTRY } from "@/components/tabs/registry";
import { TileSidebarToggle } from "@/components/tile/TileSidebarToggle";
import { lockDragSelection } from "@/lib/dragGuard";
import { useAppearanceStore } from "@/store/useAppearanceStore";

const MIN_W = 140;
const MAX_W = 420;
const DEFAULT_W = 200;

/** Per-tab sidebar, docked to the tile's left or right edge per the global
 *  appearance setting. Static toggle (mounted only when open, no slide), but
 *  drag-resizable via the outer-edge handle. Its header holds the pinned sidebar
 *  toggle so the toggle's x matches the closed-state toolbar toggle. */
export function TabSidebar({ tile, tab }: { tile: TileNode; tab: Tab }) {
  const def = TAB_REGISTRY[tab.type];
  const isRight = useAppearanceStore((s) => s.sidebarPlacement === "right");
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_W);
  const dragging = useRef(false);
  const releaseRef = useRef<(() => void) | null>(null);

  // The handle lives on the sidebar's outer edge, so resizing measures from the
  // opposite (fixed) edge: the right edge when docked right, else the left.
  const onMove = (e: PointerEvent) => {
    if (!dragging.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const next = isRight ? rect.right - e.clientX : e.clientX - rect.left;
    setWidth(Math.min(MAX_W, Math.max(MIN_W, next)));
  };
  const onUp = () => {
    dragging.current = false;
    releaseRef.current?.();
    releaseRef.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={ref}
      // Exempts sidebar clicks from the host tile's focus capture (see Tile).
      data-tab-sidebar
      className={`relative flex h-full shrink-0 flex-col border-tertiary bg-editor ${
        isRight ? "order-last border-l" : "border-r"
      }`}
      style={{ width }}
    >
      <div
        className={`flex h-toolbar shrink-0 items-center px-[6px] ${isRight ? "justify-end" : ""}`}
      >
        <span
          className={`flex w-6 shrink-0 items-center ${isRight ? "justify-end" : "justify-center"}`}
        >
          <TileSidebarToggle tile={tile} tab={tab} />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <def.Sidebar tab={tab} tileId={tile.id} />
      </div>
      <div
        onPointerDown={() => {
          dragging.current = true;
          releaseRef.current = lockDragSelection("col-resize");
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
        className={`group/sh absolute inset-y-0 z-10 w-2 cursor-col-resize ${
          isRight ? "-left-1" : "-right-1"
        }`}
        aria-hidden="true"
      >
        <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover/sh:bg-accent" />
      </div>
    </div>
  );
}
