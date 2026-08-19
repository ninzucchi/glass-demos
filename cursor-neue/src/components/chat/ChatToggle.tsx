import { IconButton } from "@/components/ui/IconButton";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Show/hide the chat (agent) panel, mirroring the sidebar toggle. Lives in the
 *  window-corner nav controls so the chat is reachable in every layout — most
 *  importantly as the entry point back when the Content pane is maximized. */
export function ChatToggle() {
  const windowId = useWindowId();
  const chatCollapsed = useWindow()?.chatCollapsed ?? false;
  const toggleChat = useWorkspaceStore((s) => s.toggleChat);
  const visible = !chatCollapsed;
  return (
    <IconButton
      name="agents"
      size="base"
      active={visible}
      onClick={() => toggleChat(windowId)}
      aria-label={visible ? "Hide agent panel" : "Show agent panel"}
      aria-pressed={visible}
    />
  );
}
