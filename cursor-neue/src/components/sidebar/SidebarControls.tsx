import type { ReactNode } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { ChatToggle } from "@/components/chat/ChatToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSection,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { useSidebarChromeCollapsed, useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";

const TRAFFIC = ["#ff5f57", "#febc2e", "#28c840"];

/** Funnel next to the agent-list header. Picks workspace folders vs recency. */
export function AgentGroupFilter() {
  const windowId = useWindowId();
  const groupBy = useWindow()?.agentGroupBy ?? "workspace";
  const setAgentGroupBy = useWorkspaceStore((s) => s.setAgentGroupBy);

  const onGroupBy = (value: string) => {
    if (value === "workspace" || value === "updated") {
      setAgentGroupBy(windowId, value);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Group agents"
          className="flex size-4 shrink-0 items-center justify-center text-[color:var(--icon-tertiary)] hover:text-[color:var(--icon-secondary)] data-[state=open]:text-[color:var(--icon-secondary)]"
        >
          <Icon name="funnel-simple" size="base" color="inherit" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSection>
          <DropdownMenuLabel>Group by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={groupBy} onValueChange={onGroupBy}>
            <DropdownMenuRadioItem value="workspace">Workspace</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="updated">Updated</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSection>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Group-by filter plus a cosmetic new-folder control. Sits on Chats (Today)
 *  or on Workspaces / Recents (Merged). */
export function AgentGroupControls() {
  return (
    <div className="flex items-center gap-4">
      <AgentGroupFilter />
      <button
        type="button"
        aria-label="New folder"
        className="flex size-4 shrink-0 items-center justify-center text-[color:var(--icon-tertiary)] hover:text-[color:var(--icon-secondary)]"
      >
        <Icon name="folder-plus" size="base" color="inherit" />
      </button>
    </div>
  );
}

/** Muted section label (per Figma SectionHeader): min-h 24, px-6/py-4, ui/sm tertiary.
 *  `trailing` sits on the far edge (justify-between) — used for the group-by filter.
 *  Pass `onToggle` to make the label a disclosure (chevron rotates like folders). */
export function SidebarSectionHeader({
  label,
  trailing,
  collapsed,
  onToggle,
}: {
  label: string;
  trailing?: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const title = (
    <span className="truncate text-sm text-tertiary mix-blend-plus-darker">{label}</span>
  );
  return (
    <div className="group/section flex min-h-[24px] items-center justify-between gap-1.5 px-1.5 py-1">
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {title}
          <Icon
            name="chevron-right"
            size="sm"
            color="tertiary"
            className={clsx(
              "shrink-0 opacity-0 transition-transform duration-slow ease-out-quart group-hover/section:opacity-100",
              !collapsed && "rotate-90",
            )}
          />
        </button>
      ) : (
        title
      )}
      {trailing}
    </div>
  );
}

/** macOS-style traffic lights. Cosmetic by default. `onClose` makes the red
 *  light close the window. `onZoom` makes the green light fit the window. */
export function TrafficLights({
  onClose,
  onZoom,
}: {
  onClose?: () => void;
  onZoom?: () => void;
} = {}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {TRAFFIC.map((c, i) => {
        const onClick = i === 0 ? onClose : i === 2 ? onZoom : undefined;
        const label = i === 0 ? "Close window" : i === 2 ? "Fit window" : undefined;
        if (onClick) {
          return (
            <button
              key={c}
              type="button"
              aria-label={label}
              onClick={onClick}
              className="h-3.5 w-3.5 rounded-full"
              style={{ background: c }}
            />
          );
        }
        return <span key={c} className="h-3.5 w-3.5 rounded-full" style={{ background: c }} />;
      })}
    </div>
  );
}

/** Traffic lights wired to the current window: red closes, green fits.
 *  Used wherever the lights appear (sidebar header and the collapsed-sidebar
 *  re-expand cluster) so close/fit behavior never drifts between placements. */
export function WindowTrafficLights() {
  const windowId = useWindowId();
  const closeWindow = useWorkspaceStore((s) => s.closeWindow);
  const fitWindow = useWorkspaceStore((s) => s.fitWindow);
  return (
    <TrafficLights
      onClose={() => closeWindow(windowId)}
      onZoom={() => fitWindow(windowId)}
    />
  );
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
