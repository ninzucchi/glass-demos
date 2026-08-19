import clsx from "clsx";
import { Panel, PanelGroup } from "react-resizable-panels";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ContentPanel } from "@/components/content/ContentPanel";
import { OpenContentDropZone } from "@/components/content/OpenContentDropZone";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useChainSidebarCollapse } from "@/components/layout/useChainSidebarCollapse";
import { useDeferredPaneCollapse } from "@/components/layout/useDeferredPaneCollapse";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTabDragStore } from "@/store/tabDrag";
import { useSidebarCollapseChain, useWindowId } from "@/components/window/WindowContext";
import {
  useActiveContent,
  useActiveScopeId,
  useMaximizeContent,
  useWindow,
  useWorkspaceStore,
} from "@/store/useWorkspaceStore";

// Established chat/content split sizing (percentages). Each pane holds at its
// min before the chat over-drags past it to collapse (0) and maximize Content.
const CHAT_DEFAULT_SIZE = 45;
const CHAT_MIN_SIZE = 25;
const CONTENT_DEFAULT_SIZE = 55;
const CONTENT_MIN_SIZE = 25;

/** The main area holds the Chat and Content panes. Either can collapse to icon
 *  entry points: hiding Content leaves Chat full; collapsing Chat (maximize)
 *  leaves Content full. When both panes show, they sit in a drag-resizable
 *  split whose divider double-click maximizes/restores. The window-corner
 *  controls (sidebar re-expand cluster, split toggle) live in whichever pane
 *  occupies that corner. */
export function MainContainer() {
  const open = useActiveContent().open;
  // The window's top-left pane is flagged `topLeft` so it hosts the re-expand
  // control cluster (traffic lights + sidebar/agent toggles + search); the
  // cluster self-gates on `sidebarCollapsed`, so it only shows once collapsed.
  const windowId = useWindowId();
  const scopeId = useActiveScopeId();
  const win = useWindow();
  const chatCollapsed = win?.chatCollapsed ?? false;
  const { maximized, toggle } = useMaximizeContent();
  const toggleChat = useWorkspaceStore((s) => s.toggleChat);
  // Dragging the divider collapses the chat (agent) pane; the commit is deferred
  // to drag-end (shared hook) so the divider stays draggable the whole time:
  // dragging back past the snap point cancels before release. Continuing the
  // same leftward drag past the chat's collapse chains into the sidebar's (see
  // onChatDragging / useChainSidebarCollapse), so one gesture can close both.
  // Double-click, by contrast, is the combined maximize of both chat and sidebar
  // — see the ResizeHandle below.
  const chatCollapse = useDeferredPaneCollapse(() => toggleChat(windowId));
  // Continue that same leftward over-drag into the sidebar: once the chat has
  // closed, dragging on past the sidebar's midpoint collapses it too, so one
  // gesture can close both panes instead of needing a separate drag.
  const sidebarChain = useSidebarCollapseChain();
  const chainSidebarCollapse = useChainSidebarCollapse(chatCollapse.pending, sidebarChain);
  const onChatDragging = (isDragging: boolean) => {
    chainSidebarCollapse(isDragging);
    chatCollapse.onDragging(isDragging);
  };
  // Drop the unmaximize edge's pointer events mid-drag so tab drops still
  // hit-test through to the tiles underneath.
  const dragging = useTabDragStore((s) => s.source !== null);

  // Content hidden -> Chat fills the main area (the two panes are never both
  // hidden). Checked first so this holds regardless of the chat-collapsed flag.
  if (!open) {
    return (
      // `data-content-closed` lets a dragged tab target this window: releasing
      // here opens the content pane and appends the tab. `relative` anchors the
      // drop overlay.
      <div
        data-content-closed
        data-window-id={windowId}
        data-scope-id={scopeId}
        className="relative h-full w-full"
      >
        <ChatPanel topRight topLeft />
        <OpenContentDropZone windowId={windowId} scopeId={scopeId} />
      </div>
    );
  }

  // Chat collapsed (maximized) -> Content fills the main area, so it owns the
  // window's top-left corner. The re-expand cluster hosted there self-gates on
  // `sidebarCollapsed`, rendering nothing while the sidebar is the corner.
  if (chatCollapsed) {
    return (
      <div className="relative h-full w-full">
        <ContentPanel topRight topLeft />
        {/* Inverse of the divider double-click: when fully maximized (Content sits
            at the window's left edge), double-clicking that edge restores the
            split. Only when fully maximized, so it never overlaps the sidebar
            resize handle. z-30 sits above the window-frame resize handles (z-20)
            so the visible left edge is what's hit; the frame's handle still
            overhangs just outside the window border for edge-resize. The cursor
            matches the window edge (ew-resize), not the split divider's
            col-resize. Pointer events drop mid tab-drag so drops hit-test
            through to the tiles. */}
        {maximized && (
          <Tooltip content="Double-Click to Restore" side="right">
            <div
              onDoubleClick={toggle}
              className={clsx(
                "absolute inset-y-0 left-0 z-30 w-2 cursor-ew-resize select-none",
                dragging && "pointer-events-none",
              )}
            />
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    // No autoSaveId: the chat/content split is identical in every window, so a
    // shared autoSaveId would leak its ratio/collapse across windows. Chat
    // collapse is the per-window store flag; the split ratio stays in-memory per
    // group so each window stays sandboxed.
    <PanelGroup direction="horizontal" className="h-full w-full">
      {/* Mirrors the sidebar's over-drag-to-collapse: shrinking the chat past its
          min snaps it to 0 (live preview), and releasing there hides the chat pane
          (sidebar untouched). Dragging back out before release expands the chat
          again, cancelling the collapse. Double-click instead maximizes fully
          (chat + sidebar). */}
      <Panel
        defaultSize={CHAT_DEFAULT_SIZE}
        minSize={CHAT_MIN_SIZE}
        order={1}
        collapsible
        collapsedSize={0}
        onCollapse={chatCollapse.onCollapse}
        onExpand={chatCollapse.onExpand}
      >
        <ChatPanel topLeft />
      </Panel>
      <ResizeHandle
        direction="horizontal"
        onDoubleClick={toggle}
        onDragging={onChatDragging}
        hint="Double-Click to Maximize"
        hintSide="left"
      />
      <Panel defaultSize={CONTENT_DEFAULT_SIZE} minSize={CONTENT_MIN_SIZE} order={2}>
        <ContentPanel topRight />
      </Panel>
    </PanelGroup>
  );
}
