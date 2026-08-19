import { PanelRenderer } from "@/components/layout/PanelRenderer";
import { ChatRootDropZone } from "@/components/chat/ChatRootDropZone";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow } from "@/store/useWorkspaceStore";

export function ChatPanel({
  topRight = false,
  topLeft = false,
}: {
  topRight?: boolean;
  topLeft?: boolean;
}) {
  const windowId = useWindowId();
  const win = useWindow();
  if (!win) return null;
  return (
    // `data-chat-root` marks the bounds used for full-span (root) chat tab
    // drops, the chat counterpart of the content panel's `data-content-root`.
    // Chat roots are per-window (no scope id). `relative` anchors the drop zone.
    <div
      data-chat-root
      data-window-id={windowId}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-chrome"
    >
      <PanelRenderer node={win.chatLayout} variant="chat" topRight={topRight} topLeft={topLeft} />
      <ChatRootDropZone windowId={windowId} />
    </div>
  );
}
