import type { CSSProperties } from "react";
import type { SplitSide } from "@/types";
import { useTabDragStore } from "@/store/tabDrag";

// The full-span preview fills the half of the WHOLE chat panel that the new
// root pane will occupy (right column / bottom row spanning every chat tile).
const SIDE_INSET: Record<SplitSide, CSSProperties> = {
  right: { top: 0, bottom: 0, right: 0, left: "50%" },
  down: { left: 0, right: 0, bottom: 0, top: "50%" },
};

/** Chat counterpart of the content panel's `RootDropZone`: shown when a chat
 *  tab is dragged onto the chat panel's outer edge for a full-span root split.
 *  Scoped by `windowId` (chat roots are per-window, not per-scope). */
export function ChatRootDropZone({ windowId }: { windowId: string }) {
  const side = useTabDragStore((s) =>
    s.target?.scope === "chat-root" && s.target.windowId === windowId ? s.target.side : null,
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
