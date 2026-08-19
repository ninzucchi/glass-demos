import { useRef } from "react";

/** Collapsing a resizable pane by dragging past its min commits to the store
 *  only on pointer-up, so dragging the divider back out before release cancels
 *  the collapse. react-resizable-panels fires onCollapse/onExpand live during
 *  the drag; we mirror that into a ref and run `commit` when the drag ends while
 *  still collapsed. Shared by the sidebar and chat panes so the deferral
 *  semantics can't drift between the two. */
export function useDeferredPaneCollapse(commit: () => void) {
  const pendingRef = useRef(false);
  return {
    onCollapse: () => {
      pendingRef.current = true;
    },
    onExpand: () => {
      pendingRef.current = false;
    },
    onDragging: (isDragging: boolean) => {
      if (!isDragging && pendingRef.current) commit();
    },
    // Whether the pane is currently over-dragged into its collapsed (snapped-to-0)
    // state, ahead of the deferred commit. Lets a chained gesture gate follow-on
    // work (e.g. continuing into the sidebar collapse) on this pane being closed.
    pending: () => pendingRef.current,
  };
}
