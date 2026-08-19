import { useMemo } from "react";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useUiStore } from "@/store/useUiStore";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { AgentList } from "@/components/sidebar/AgentList";
import { WorkspaceGroup } from "@/components/sidebar/WorkspaceGroup";
import { IconButton } from "@/components/ui/IconButton";
import { WorkspaceSwitcher } from "@/components/sidebar/WorkspaceSwitcher";
import {
  SidebarNavControls,
  SidebarSectionHeader,
  WindowTrafficLights,
} from "@/components/sidebar/SidebarControls";
import { groupAgentsByRecency, visibleWorkspaceIds } from "@/types";

function SidebarHeader() {
  // Traffic lights, then the toggle+search control group (its own tight gap).
  return (
    <div className="flex h-toolbar shrink-0 items-center gap-2 pl-3.5 pr-2">
      <WindowTrafficLights />
      <SidebarNavControls />
    </div>
  );
}

function SidebarFooter() {
  // Uniform p-2 so the switcher (left) and filter button (right) sit an even 8px
  // from the window edges. The filter button is inert (appearance controls live
  // in the dock's gear menu).
  return (
    <div className="flex items-end p-2">
      <WorkspaceSwitcher />
      <IconButton name="funnel-simple" size="base" aria-label="Filter" className="ml-auto" />
    </div>
  );
}

export function Sidebar() {
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const windowId = useWindowId();
  const win = useWindow();
  const scope = win?.workspaceScope ?? null;
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const openCustomize = useUiStore((s) => s.openCustomize);

  const standalone = useMemo(
    () => agentOrder.map((id) => agents[id]).filter((a) => a.workspaceId === null),
    [agentOrder, agents],
  );

  // Single-workspace view: this workspace's agents bucketed by recency. Empty
  // (and unused) when showing all workspaces, which renders folders instead.
  const recencyBuckets = useMemo(
    () =>
      scope
        ? groupAgentsByRecency(agentOrder.map((id) => agents[id]).filter((a) => a.workspaceId === scope))
        : [],
    [scope, agentOrder, agents],
  );

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar backdrop-blur-[12px]">
      <SidebarHeader />
      <div className="flex flex-col gap-px px-2 pt-1">
        <SidebarCell label="Search" leading={{ kind: "action", icon: "magnifying-glass" }} />
        <SidebarCell
          label="New Agent"
          leading={{ kind: "action", icon: "agent" }}
          onClick={() => createAgent(windowId)}
        />
        <SidebarCell label="Inbox" leading={{ kind: "action", icon: "tray" }} />
        <SidebarCell
          label="Customize"
          leading={{ kind: "action", icon: "extensions" }}
          onClick={() => openCustomize(windowId)}
        />
      </div>

      <div
        className="scrollbar-overlay flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-2 pt-3"
        style={{
          // Real px-2 insets on both sides (no scrollbar-gutter reservation:
          // overlay scrollbars reserve nothing, which left the right edge
          // flush). The overlay thumb — transparent until hover — draws over
          // the 8px padding, so rows stay symmetric whether or not it shows.
          maskImage:
            "linear-gradient(to bottom, transparent, #000 20px, #000 calc(100% - 20px), transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, #000 20px, #000 calc(100% - 20px), transparent)",
        }}
      >
        {scope === null ? (
          <div className="flex flex-col gap-1">
            <SidebarSectionHeader label="Workspaces" />
            {visibleWorkspaceIds(scope, workspaceOrder).map((id) => (
              <WorkspaceGroup key={id} workspace={workspaces[id]} />
            ))}
          </div>
        ) : (
          // Single workspace: drop the redundant folder header and group the
          // workspace's agents under recency sections (Today / Yesterday / ...).
          recencyBuckets.map((bucket) => (
            <div key={bucket.id}>
              <SidebarSectionHeader label={bucket.label} />
              <div className="flex flex-col gap-px">
                <AgentList agents={bucket.agents} />
              </div>
            </div>
          ))
        )}

        {scope === null && standalone.length > 0 && (
          <div>
            <SidebarSectionHeader label="Agents" />
            <div className="flex flex-col gap-px">
              <AgentList agents={standalone} />
            </div>
          </div>
        )}
      </div>

      <SidebarFooter />
    </aside>
  );
}
