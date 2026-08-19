import { useMemo } from "react";
import { PanelRenderer } from "@/components/layout/PanelRenderer";
import { RootDropZone } from "@/components/content/RootDropZone";
import { tileSidebarType } from "@/components/tabs/registry";
import { useWindowId } from "@/components/window/WindowContext";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { sharedSidebarBindings } from "@/store/layoutTree";
import { useAppearanceStore } from "@/store/useAppearanceStore";
import { useActiveContent, useActiveScopeId, useWindow } from "@/store/useWorkspaceStore";

export function ContentPanel({
  topRight = false,
  topLeft = false,
}: {
  topRight?: boolean;
  topLeft?: boolean;
}) {
  const windowId = useWindowId();
  const scopeId = useActiveScopeId();
  const content = useActiveContent();
  const isRight = useAppearanceStore((s) => s.sidebarPlacement === "right");
  const focusedTileId = useWindow()?.focusedContentTileId ?? null;
  // One sidebar per side-by-side group, hosted by the pane nearest the sidebar
  // edge and bound to the focused pane's tab (see sharedSidebarBindings).
  // Flag off = no bindings map, and every tile hosts its own sidebar.
  const shared = useFeatureFlags((s) => s.flags.sharedTabSidebars);
  const sidebarBindings = useMemo(
    () =>
      shared
        ? sharedSidebarBindings(content.layout, isRight, focusedTileId, tileSidebarType)
        : undefined,
    [shared, content.layout, isRight, focusedTileId],
  );
  return (
    // `data-content-root` marks the bounds used for full-span (root) tab drops.
    // `data-window-id` + `data-scope-id` let a root-edge drop name the target
    // window's content tree (a scope id alone isn't unique across windows).
    // `relative` anchors the RootDropZone overlay to the whole panel.
    <div
      data-content-root
      data-window-id={windowId}
      data-scope-id={scopeId}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-editor"
    >
      <PanelRenderer
        node={content.layout}
        variant="content"
        topRight={topRight}
        topLeft={topLeft}
        sidebarBindings={sidebarBindings}
      />
      <RootDropZone windowId={windowId} scopeId={scopeId} />
    </div>
  );
}
