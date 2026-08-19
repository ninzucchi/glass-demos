import { useRef } from "react";
import type { SidebarCollapseChain } from "@/components/window/WindowContext";

// Px the pointer must travel back past the collapse line before the chained
// sidebar collapse is undone — a hysteresis band so the sidebar doesn't flicker
// open/closed while the cursor hovers right on the threshold.
const REEXPAND_HYSTERESIS_PX = 24;

/** Extends the chat (agent) divider's over-drag so the same leftward gesture can
 *  continue past the chat's own collapse and close the sidebar too. Once the
 *  chat has snapped closed, dragging the cursor left past the sidebar's midpoint
 *  live-collapses the sidebar (cancellable by dragging back out before release);
 *  the collapse is committed on drag-end, mirroring the panes' deferred semantics.
 *
 *  Returns an `onDragging` to compose with the chat pane's deferred-collapse hook
 *  and hand to its ResizeHandle. */
export function useChainSidebarCollapse(
  chatCollapsed: () => boolean,
  chain: SidebarCollapseChain | null,
) {
  // Read live values through refs so the (stable) pointer listener never goes
  // stale — addEventListener/removeEventListener must see the same reference.
  const chainRef = useRef(chain);
  chainRef.current = chain;
  const chatCollapsedRef = useRef(chatCollapsed);
  chatCollapsedRef.current = chatCollapsed;

  // Captured once at drag-start from the sidebar's open width, so it stays valid
  // after the live collapse snaps the sidebar to 0 (its width would read 0 then).
  const thresholdRef = useRef<number | null>(null);
  const previewingRef = useRef(false);

  const onMove = useRef((e: PointerEvent) => {
    const c = chainRef.current;
    const threshold = thresholdRef.current;
    // Only chain once the chat has closed: until then this is a plain chat resize.
    if (!c || threshold == null || !chatCollapsedRef.current()) return;
    if (!previewingRef.current && e.clientX < threshold) {
      previewingRef.current = true;
      c.preview();
    } else if (previewingRef.current && e.clientX > threshold + REEXPAND_HYSTERESIS_PX) {
      previewingRef.current = false;
      c.cancel();
    }
  }).current;

  return (isDragging: boolean) => {
    const c = chainRef.current;
    if (isDragging) {
      previewingRef.current = false;
      thresholdRef.current = c ? c.thresholdX() : null;
      window.addEventListener("pointermove", onMove);
    } else {
      window.removeEventListener("pointermove", onMove);
      if (previewingRef.current) {
        c?.commit();
        previewingRef.current = false;
      }
    }
  };
}
