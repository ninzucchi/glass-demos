import { useEffect } from "react";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useWindowId } from "@/components/window/WindowContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Mouse button 3/4 is browser back/forward. Swallow it and hop the crumb stack. */
export function useCrumbMouseNav() {
  const windowId = useWindowId();
  const crumbs = useFeatureFlags((s) => s.ephemeralTabs === "crumbs");
  const isTop = useWorkspaceStore((s) => s.windowOrder[s.windowOrder.length - 1] === windowId);
  const crumbBack = useWorkspaceStore((s) => s.crumbBack);
  const crumbForward = useWorkspaceStore((s) => s.crumbForward);

  useEffect(() => {
    if (!crumbs || !isTop) return;
    const swallow = (e: PointerEvent | MouseEvent) => {
      if (e.button !== 3 && e.button !== 4) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const go = (e: PointerEvent | MouseEvent) => {
      if (e.button !== 3 && e.button !== 4) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.button === 3) crumbBack(windowId);
      else crumbForward(windowId);
    };
    window.addEventListener("pointerdown", swallow, true);
    window.addEventListener("mouseup", go, true);
    window.addEventListener("auxclick", go, true);
    return () => {
      window.removeEventListener("pointerdown", swallow, true);
      window.removeEventListener("mouseup", go, true);
      window.removeEventListener("auxclick", go, true);
    };
  }, [crumbs, isTop, windowId, crumbBack, crumbForward]);
}
