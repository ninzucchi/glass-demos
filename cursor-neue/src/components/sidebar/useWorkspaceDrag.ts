import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { isOutsideWindows, newWindowGeo } from "@/components/desktop/geometry";
import { useWorkspaceDragStore } from "@/store/workspaceDrag";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useFeatureFlags } from "@/store/useFeatureFlags";

// Movement (px) before a press becomes a drag, so plain clicks still toggle the
// workspace open/closed. Mirrors TabHandle's threshold.
const DRAG_THRESHOLD = 4;

/** Drag a workspace sidebar row: reorder in the list (others make space), or
 *  release outside every window to spawn a filtered window. Escape cancels.
 *  `wasDragged()` lets the row swallow the click-to-collapse after a drag. */
export function useDragWorkspaceOut(workspaceId: string, label: string): {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  dragging: boolean;
  wasDragged: () => boolean;
} {
  const openWorkspaceInNewWindow = useWorkspaceStore((s) => s.openWorkspaceInNewWindow);
  const moveWorkspace = useWorkspaceStore((s) => s.moveWorkspace);
  const moveSidebarFolder = useWorkspaceStore((s) => s.moveSidebarFolder);
  const dragging = useWorkspaceDragStore((s) => s.source?.workspaceId === workspaceId);
  // Suppress the click-to-collapse that fires right after a drag ends.
  const didDragRef = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return; // primary button only; keep right-click for menus
    didDragRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;
    const { begin, move, end } = useWorkspaceDragStore.getState();

    const onMove = (ev: PointerEvent) => {
      if (!started) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
        started = true;
        didDragRef.current = true;
        begin({ workspaceId, label }, { x: ev.clientX, y: ev.clientY });
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
      move({ x: ev.clientX, y: ev.clientY });
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const onUp = (ev: PointerEvent) => {
      try {
        if (started) {
          if (isOutsideWindows(ev.clientX, ev.clientY)) {
            openWorkspaceInNewWindow(workspaceId, newWindowGeo({ x: ev.clientX, y: ev.clientY }));
          } else {
            const over = useWorkspaceDragStore.getState().overIndex;
            if (over != null) {
              if (useFeatureFlags.getState().sidebarProjects === "flat") {
                moveSidebarFolder(workspaceId, over);
              } else {
                moveWorkspace(workspaceId, over);
              }
            }
          }
        }
      } finally {
        cleanup();
        end();
      }
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        cleanup();
        end();
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
  };

  return { onPointerDown, dragging, wasDragged: () => didDragRef.current };
}
