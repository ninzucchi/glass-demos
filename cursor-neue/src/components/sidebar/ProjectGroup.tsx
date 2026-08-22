import { useMemo, useState } from "react";
import {
  agentsInProject,
  isAgentPinned,
  sidebarCollapsed,
  type Agent,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { AgentList } from "@/components/sidebar/AgentList";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { SidebarCollapse } from "@/components/sidebar/SidebarCollapse";

const VISIBLE = 3;

/** A project row: folder chrome plus the project's own chat (click opens it).
 *  Nested agents live here instead of Chats. */
export function ProjectGroup({
  project,
  padded = true,
}: {
  project: Agent;
  /** False when this folder is the last row in its section. */
  padded?: boolean;
}) {
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const windowId = useWindowId();
  const win = useWindow();
  const activeAgentId = win?.activeAgentId;
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const toggleSidebarCollapsed = useWorkspaceStore((s) => s.toggleSidebarCollapsed);
  const collapsed = sidebarCollapsed(project.id, win?.collapsedSidebar);
  const [seeMore, setSeeMore] = useState(false);

  const list = useMemo(
    () =>
      agentsInProject(agents, agentOrder, project.id).filter(
        (a) => !isAgentPinned(pinnedAgents, a.id),
      ),
    [agents, agentOrder, pinnedAgents, project.id],
  );

  const shown = seeMore ? list : list.slice(0, VISIBLE);
  const showMore = !seeMore && list.length > VISIBLE;

  return (
    <div className="flex flex-col gap-px">
      <SidebarCell
        label={project.title}
        leading={{
          kind: "project",
          collapsed,
          icon: project.icon ?? "pencil",
          color: project.color ?? "blue",
        }}
        selected={project.id === activeAgentId}
        onClick={() => setActiveAgent(windowId, project.id)}
        onLeadingClick={() => toggleSidebarCollapsed(windowId, project.id)}
        onAddClick={() => {
          createAgent(windowId, {
            workspaceId: project.workspaceId,
            projectId: project.id,
          });
        }}
      />
      <SidebarCollapse open={!collapsed} padded={padded}>
        <div className="flex flex-col gap-px">
          <AgentList agents={shown} nested />
          {showMore && (
            <SidebarCell muted nested label="See more" onClick={() => setSeeMore(true)} />
          )}
        </div>
      </SidebarCollapse>
    </div>
  );
}
