import clsx from "clsx";
import { PanelResizeHandle } from "react-resizable-panels";
import { Tooltip } from "@/components/ui/Tooltip";

type Side = "top" | "right" | "bottom" | "left";

/** Thin 1px divider with an invisible wider grab area, for react-resizable-panels.
 *  `direction` matches the parent PanelGroup direction. `onDoubleClick` (when
 *  provided) fires on the wider grab area — e.g. to maximize/restore a pane.
 *  `hint`, when set, shows a tooltip on the grab area after the hover delay;
 *  `hintSide` controls which side it appears on (defaults to away from the bar). */
export function ResizeHandle({
  direction,
  onDoubleClick,
  onDragging,
  hint,
  hintSide,
}: {
  direction: "horizontal" | "vertical";
  onDoubleClick?: () => void;
  onDragging?: (isDragging: boolean) => void;
  hint?: string;
  hintSide?: Side;
}) {
  const horizontal = direction === "horizontal";
  const grab = (
    <div
      onDoubleClick={onDoubleClick}
      // 12px hit area (vs the 1px line) so it covers react-resizable-panels'
      // ~11px hover zone (1px handle + 5px fine margin each side) — the tooltip
      // then fires wherever the line shows its hover state, not just dead-center.
      className={clsx(
        "absolute z-10 select-none",
        horizontal
          ? "inset-y-0 left-1/2 w-3 -translate-x-1/2"
          : "inset-x-0 top-1/2 h-3 -translate-y-1/2",
      )}
    />
  );
  return (
    <PanelResizeHandle
      onDragging={onDragging}
      className={clsx(
        // The handle is a painted 1px strip (not a CSS border), so it's a fill
        // (bg-*) sourced from the divider ramp's opaque token. Opaque is required
        // so the line doesn't bleed the desktop wallpaper through the transparent
        // window shell behind the glass sidebar. Hover/drag flips the fill to accent.
        "group/handle relative bg-[color:var(--border-tertiary-opaque)] transition-colors data-[resize-handle-state=hover]/handle:bg-accent data-[resize-handle-state=drag]/handle:bg-accent",
        horizontal ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
      )}
    >
      {hint ? (
        <Tooltip content={hint} side={hintSide ?? (horizontal ? "right" : "bottom")}>
          {grab}
        </Tooltip>
      ) : (
        grab
      )}
    </PanelResizeHandle>
  );
}
