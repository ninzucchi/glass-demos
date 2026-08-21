import { PanelRenderer } from "@/components/layout/PanelRenderer";
import { RootDropZone } from "@/components/content/RootDropZone";
import { useWindowId } from "@/components/window/WindowContext";
import { useActiveContent, useActiveScopeId } from "@/store/useWorkspaceStore";

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
      />
      <RootDropZone windowId={windowId} scopeId={scopeId} />
    </div>
  );
}
