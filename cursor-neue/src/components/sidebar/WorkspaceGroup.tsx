import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  agentInWorkspace,
  isAgentPinned,
  isChatsAgent,
  isUnionWorkspaceId,
  type Agent,
  type Workspace,
  unionWorkspaceMemberIds,
  workspaceFolderCollapsed,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { SidebarCollapse } from "@/components/sidebar/SidebarCollapse";
import { AgentList } from "@/components/sidebar/AgentList";
import { ProjectGroup } from "@/components/sidebar/ProjectGroup";
import { useDragWorkspaceOut } from "@/components/sidebar/useWorkspaceDrag";

const VISIBLE = 3;

export function WorkspaceGroup({
  workspace,
  padded = true,
  projects,
}: {
  workspace: Workspace;
  /** False when this folder is the last row in its section. */
  padded?: boolean;
  /** FlatNested: projects whose workspace union resolves to this folder. */
  projects?: Agent[];
}) {
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const windowId = useWindowId();
  const win = useWindow();
  // Collapse is per-window so toggling a folder here never reorders another
  // window's sidebar (workspaces themselves are shared).
  const collapsed = workspaceFolderCollapsed(workspace, win?.collapsedSidebar);
  const toggleSidebarCollapsed = useWorkspaceStore((s) => s.toggleSidebarCollapsed);
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const synthetic = isUnionWorkspaceId(workspace.id);
  const { onPointerDown, dragging, wasDragged } = useDragWorkspaceOut(workspace.id, workspace.name);
  // One-way: See more reveals the rest of the folder. No See less — the
  // expanded list stays open for the life of this mount.
  const [expanded, setExpanded] = useState(false);

  const list = useMemo(
    () =>
      agentOrder
        .map((id) => agents[id])
        .filter(
          (a) =>
            !!a &&
            agentInWorkspace(a, workspace.id) &&
            isChatsAgent(a) &&
            !isAgentPinned(pinnedAgents, a.id),
        ),
    [agentOrder, agents, pinnedAgents, workspace.id],
  );

  const shown = expanded ? list : list.slice(0, VISIBLE);
  const showMore = !expanded && list.length > VISIBLE;

  return (
    <div
      data-sidebar-flip={`workspace:${workspace.id}`}
      className={clsx("flex flex-col gap-px", dragging && "opacity-40")}
    >
      <div onPointerDown={synthetic ? undefined : onPointerDown}>
        <SidebarCell
          label={workspace.name}
          leading={{ kind: "workspace", collapsed }}
          onClick={() => {
            if (wasDragged()) return;
            toggleSidebarCollapsed(windowId, workspace.id);
          }}
          onAddClick={() =>
            createAgent(windowId, {
              workspaceId: synthetic ? unionWorkspaceMemberIds(workspace.id)[0] : workspace.id,
              workspaceIds: synthetic ? unionWorkspaceMemberIds(workspace.id) : undefined,
            })
          }
        />
      </div>
      <SidebarCollapse open={!collapsed} padded={padded}>
        <div className="flex flex-col gap-px">
          <AgentList agents={shown} nestLevel={1} />
          {showMore && (
            // No leading icon: SidebarCell still reserves the agent 20px slot so
            // the label lines up with agent titles.
            <SidebarCell muted nestLevel={1} label="See more" onClick={() => setExpanded(true)} />
          )}
          {projects?.map((project, i) => (
            <ProjectGroup
              key={project.id}
              project={project}
              nestLevel={1}
              padded={i < projects.length - 1}
            />
          ))}
        </div>
      </SidebarCollapse>
    </div>
  );
}
