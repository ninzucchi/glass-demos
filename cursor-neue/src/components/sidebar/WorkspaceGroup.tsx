import { useMemo } from "react";
import clsx from "clsx";
import type { Workspace } from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { AgentList } from "@/components/sidebar/AgentList";
import { useDragWorkspaceOut } from "@/components/sidebar/useWorkspaceDrag";

const VISIBLE = 5;

export function WorkspaceGroup({ workspace }: { workspace: Workspace }) {
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const windowId = useWindowId();
  const win = useWindow();
  // Collapse is per-window so toggling a folder here never reorders another
  // window's sidebar (workspaces themselves are shared).
  const collapsed = win?.collapsedWorkspaces?.[workspace.id] ?? false;
  const toggleWorkspaceCollapsed = useWorkspaceStore((s) => s.toggleWorkspaceCollapsed);
  const { onPointerDown, dragging, wasDragged } = useDragWorkspaceOut(workspace.id, workspace.name);

  const list = useMemo(
    () => agentOrder.map((id) => agents[id]).filter((a) => a.workspaceId === workspace.id),
    [agentOrder, agents, workspace.id],
  );

  const shown = collapsed ? [] : list.slice(0, VISIBLE);

  return (
    <div className="flex flex-col gap-px">
      <div onPointerDown={onPointerDown} className={clsx(dragging && "opacity-40")}>
        <SidebarCell
          label={workspace.name}
          leading={{ kind: "workspace", collapsed }}
          onClick={() => {
            if (wasDragged()) return;
            toggleWorkspaceCollapsed(windowId, workspace.id);
          }}
        />
      </div>
      <AgentList agents={shown} />
      {!collapsed && list.length > VISIBLE && <SidebarCell muted label="See more" />}
    </div>
  );
}
