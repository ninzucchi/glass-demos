import { useMemo, type ReactNode } from "react";
import {
  isProject,
  pinnedAgentsFor,
  SIDEBAR_SECTION,
  sidebarCollapsed,
  type Agent,
  type AgentGroupBy,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { AgentList } from "@/components/sidebar/AgentList";
import { chatsRows, type ChatsRow } from "@/components/sidebar/chatsRows";
import { ProjectGroup } from "@/components/sidebar/ProjectGroup";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { SidebarCollapse } from "@/components/sidebar/SidebarCollapse";
import { WorkspaceGroup } from "@/components/sidebar/WorkspaceGroup";
import {
  ChatsSectionControls,
  SidebarNavControls,
  SidebarSectionHeader,
  WindowTrafficLights,
} from "@/components/sidebar/SidebarControls";

function SidebarHeader() {
  // Traffic lights, then the toggle+search control group (its own tight gap).
  return (
    <div className="flex h-toolbar shrink-0 items-center gap-2 pl-3.5 pr-2">
      <WindowTrafficLights />
      <SidebarNavControls />
    </div>
  );
}

function chatsSectionLabel(groupBy: AgentGroupBy): string {
  switch (groupBy) {
    case "workspace":
      return "Workspaces";
    case "updated":
      return "Recents";
    default: {
      const _exhaustive: never = groupBy;
      return _exhaustive;
    }
  }
}

function SidebarSection({
  id,
  label,
  trailing,
  children,
}: {
  id: string;
  label: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const windowId = useWindowId();
  const collapsed = sidebarCollapsed(id, useWindow()?.collapsedSidebar);
  const toggleSidebarCollapsed = useWorkspaceStore((s) => s.toggleSidebarCollapsed);
  return (
    <div className="flex flex-col gap-1">
      <SidebarSectionHeader
        label={label}
        trailing={trailing}
        collapsed={collapsed}
        onToggle={() => toggleSidebarCollapsed(windowId, id)}
      />
      <SidebarCollapse open={!collapsed} padded={false}>
        <div className="flex flex-col gap-1">{children}</div>
      </SidebarCollapse>
    </div>
  );
}

function ProjectsSection() {
  const agents = useWorkspaceStore((s) => s.agents);
  const projectOrder = useWorkspaceStore((s) => s.projectOrder);
  const projects = useMemo(
    () =>
      projectOrder.map((pid) => agents[pid]).filter((a): a is Agent => !!a && isProject(a)),
    [agents, projectOrder],
  );
  return (
    <SidebarSection id={SIDEBAR_SECTION.projects} label="Projects">
      {projects.map((project, i) => (
        <ProjectGroup
          key={project.id}
          project={project}
          padded={i < projects.length - 1}
        />
      ))}
    </SidebarSection>
  );
}

function PinnedSection() {
  const agents = useWorkspaceStore((s) => s.agents);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const pinned = useMemo(
    () => pinnedAgentsFor(agents, pinnedAgents),
    [agents, pinnedAgents],
  );
  return (
    <SidebarSection id={SIDEBAR_SECTION.pinned} label="Pinned">
      <AgentList agents={pinned} />
    </SidebarSection>
  );
}

function ChatsRowView({ row }: { row: ChatsRow }) {
  switch (row.kind) {
    case "workspace":
      return <WorkspaceGroup workspace={row.workspace} padded={row.padded} />;
    case "project":
      return <ProjectGroup project={row.project} padded={row.padded} />;
    case "agent":
      return <AgentList agents={[row.agent]} />;
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

function SidebarBody({ groupBy, flat }: { groupBy: AgentGroupBy; flat: boolean }) {
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const projectOrder = useWorkspaceStore((s) => s.projectOrder);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const rows = useMemo(
    () =>
      chatsRows({
        groupBy,
        flat,
        workspaceOrder,
        workspaces,
        agents,
        agentOrder,
        projectOrder,
        pinnedAgents,
      }),
    [agentOrder, agents, flat, groupBy, pinnedAgents, projectOrder, workspaceOrder, workspaces],
  );
  return rows.map((row) => <ChatsRowView key={row.id} row={row} />);
}

export function Sidebar() {
  const windowId = useWindowId();
  const groupBy = useWindow()?.agentGroupBy ?? "workspace";
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const openCustomize = useUiStore((s) => s.openCustomize);
  const flat = useFeatureFlags((s) => s.sidebarProjects) === "flat";

  return (
    <aside className="flex h-full w-full select-none flex-col bg-sidebar backdrop-blur-[12px]">
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
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-2 pt-3"
        style={{
          // Scroll still works; the thumb is hidden so rows stay symmetric.
          maskImage:
            "linear-gradient(to bottom, transparent, #000 20px, #000 calc(100% - 20px), transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, #000 20px, #000 calc(100% - 20px), transparent)",
        }}
      >
        {!flat && <ProjectsSection />}
        <SidebarSection id={SIDEBAR_SECTION.chats} label="Chats" trailing={<ChatsSectionControls />}>
          <div className="flex flex-col gap-3">
            <PinnedSection />
            <SidebarSection id={SIDEBAR_SECTION.group} label={chatsSectionLabel(groupBy)}>
              <SidebarBody groupBy={groupBy} flat={flat} />
            </SidebarSection>
          </div>
        </SidebarSection>
      </div>
    </aside>
  );
}
