import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { ChatToggle } from "@/components/chat/ChatToggle";
import { useSidebarChromeCollapsed, useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";

const TRAFFIC = ["#ff5f57", "#febc2e", "#28c840"];

/** Muted section label (per Figma SectionHeader): min-h 24, px-6/py-4, ui/sm tertiary. */
export function SidebarSectionHeader({ label }: { label: string }) {
  return (
    <div className="flex min-h-[24px] items-center px-1.5 py-1">
      <span className="truncate text-sm text-tertiary mix-blend-plus-darker">{label}</span>
    </div>
  );
}

/** macOS-style traffic lights. Cosmetic by default; when `onClose` is given (a
 *  detached window), the red light becomes a functional close button — the dot
 *  always shows (identical to the main window), revealing an × glyph on hover. */
export function TrafficLights({ onClose }: { onClose?: () => void } = {}) {
  return (
    <div className="group/lights flex shrink-0 items-center gap-2">
      {TRAFFIC.map((c, i) =>
        i === 0 && onClose ? (
          <button
            key={c}
            type="button"
            aria-label="Close window"
            onClick={onClose}
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-luminous"
            style={{ background: c }}
          >
            <Icon
              name="x-filled"
              size="2xs"
              color="inherit"
              className="opacity-0 group-hover/lights:opacity-100"
            />
          </button>
        ) : (
          <span key={c} className="h-3.5 w-3.5 rounded-full" style={{ background: c }} />
        ),
      )}
    </div>
  );
}

/** Traffic lights wired to the current window: the red light closes the window.
 *  Used wherever the lights appear (sidebar header and the collapsed-sidebar
 *  re-expand cluster) so close behavior never drifts between placements. */
export function WindowTrafficLights() {
  const windowId = useWindowId();
  const closeWindow = useWorkspaceStore((s) => s.closeWindow);
  return <TrafficLights onClose={() => closeWindow(windowId)} />;
}

/** Collapse/expand the main sidebar. Lives in the sidebar header when expanded,
 *  and in the window's top-left (chat header) when collapsed. */
export function MainSidebarToggle() {
  const windowId = useWindowId();
  const collapsed = useWindow()?.sidebarCollapsed ?? false;
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);
  return (
    <IconButton
      name="layout-sidebar-left"
      size="base"
      active={!collapsed}
      onClick={() => toggleSidebar(windowId)}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-pressed={!collapsed}
    />
  );
}

/** Sidebar toggle + chat toggle, tightly grouped (own gap) so the pair can be
 *  placed as one unit: in the sidebar header when expanded, and in the window's
 *  top-left when collapsed. */
export function SidebarNavControls() {
  return (
    <div className="flex items-center gap-0.5">
      <MainSidebarToggle />
      <ChatToggle />
    </div>
  );
}

/** Window top-left cluster surfaced when the sidebar is collapsed: traffic
 *  lights + the sidebar re-expand/search controls. Self-gating (renders nothing
 *  while the sidebar is expanded) so it can be dropped into any corner host
 *  (chat panel or maximized content panel) without per-call-site conditions.
 *  Gates on the live visual-collapse signal (not the deferred store flag) so the
 *  traffic lights appear the instant the dragged sidebar snaps to 0 width. */
export function SidebarReexpandCluster({ className }: { className?: string }) {
  const collapsed = useSidebarChromeCollapsed();
  if (!collapsed) return null;
  return (
    <div className={clsx("flex shrink-0 items-center gap-2", className)}>
      <WindowTrafficLights />
      <SidebarNavControls />
    </div>
  );
}
