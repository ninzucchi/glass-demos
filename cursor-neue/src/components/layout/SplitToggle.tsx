import { IconButton } from "@/components/ui/IconButton";
import { useWindowId } from "@/components/window/WindowContext";
import { useActiveContent, useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Persistent split toggle in the window's top-right corner. It manages the
 *  chat|content split and lives in whichever pane occupies that corner (the
 *  chat header normally, or the content tab bar when content is maximized).
 *  Fixed-size IconButton so its x stays identical across placements.
 *
 *  Three layout states cycle through this one control:
 *    - chat only (content hidden) -> click shows content (restores the split)
 *    - chat|content split         -> click hides content (chat fills)
 *    - content maximized (chat collapsed) -> click restores the split; the
 *      next click then resumes the normal hide-content behavior.
 *  So while maximized the button un-collapses the chat instead of dropping the
 *  content pane, giving an explicit "restore split" step before the regular
 *  show/hide toggle takes over. */
export function SplitToggle() {
  const windowId = useWindowId();
  const open = useActiveContent().open;
  const chatCollapsed = useWindow()?.chatCollapsed ?? false;
  const toggleContentOpen = useWorkspaceStore((s) => s.toggleContentOpen);
  const toggleChat = useWorkspaceStore((s) => s.toggleChat);
  // A split is only on-screen when both panes are visible; maximized content
  // (chat collapsed) reads as "no split", so the button restores it.
  const split = open && !chatCollapsed;
  return (
    <IconButton
      name="layout-split-horizontal"
      size="lg"
      active={split}
      onClick={() => (chatCollapsed ? toggleChat(windowId) : toggleContentOpen(windowId))}
      aria-label={chatCollapsed ? "Restore split" : open ? "Hide content panel" : "Show content panel"}
      aria-pressed={split}
    />
  );
}
