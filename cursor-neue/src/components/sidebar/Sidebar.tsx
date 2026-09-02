import { useMemo, useRef, type ReactNode } from "react";
import {
  isAgentPinned,
  isProject,
  isTrackerOwner,
  pinnedAgentsFor,
  SIDEBAR_SECTION,
  sidebarCollapsed,
  sortTopLevelGroupFolders,
  topLevelProjectGroupItems,
  type Agent,
  type AgentGroupBy,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTabDragStore } from "@/store/tabDrag";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { AgentList } from "@/components/sidebar/AgentList";
import { chatsRows, recentsList } from "@/components/sidebar/chatsRows";
import { ProjectGroup } from "@/components/sidebar/ProjectGroup";
import { ProjectsSectionNux } from "@/components/sidebar/ProjectsNux";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { SidebarCollapse } from "@/components/sidebar/SidebarCollapse";
import { SidebarDropOutline } from "@/components/sidebar/SidebarDropOutline";
import { GroupFolderSortList } from "@/components/sidebar/GroupFolderSortList";
import { ProjectSortList } from "@/components/sidebar/ProjectSortList";
import { SidebarFooter } from "@/components/sidebar/SidebarFooter";
import { WorkspaceSortList } from "@/components/sidebar/WorkspaceSortList";
import { Icon } from "@/components/ui/Icon";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  AgentGroupControls,
  SidebarNavControls,
  SidebarSectionHeader,
  WindowTrafficLights,
} from "@/components/sidebar/SidebarControls";

function SidebarHeader() {
  // Traffic lights, then the toggle+search control group (its own tight gap).
  return (
    <div className="flex h-[var(--titlebar-h)] shrink-0 items-center gap-2 pl-3.5 pr-2">
      <WindowTrafficLights />
      <SidebarNavControls />
    </div>
  );
}

function SidebarSection({
  id,
  label,
  trailing,
  dropKind,
  children,
}: {
  id: string;
  label: string;
  trailing?: ReactNode;
  /** Agent-row drop: pin on Pinned, unpin on Chats, form a project on Projects.
   *  Project-row drop: pin on Pinned, unpin on Projects. */
  dropKind?: "pinned" | "chats" | "projects";
  children: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const windowId = useWindowId();
  const collapsed = sidebarCollapsed(id, useWindow()?.collapsedSidebar);
  const toggleSidebarCollapsed = useWorkspaceStore((s) => s.toggleSidebarCollapsed);
  const dropActive = useTabDragStore(
    (s) =>
      !!dropKind && s.target?.scope === "sidebar-section" && s.target.section === dropKind,
  );
  return (
    <div ref={hostRef} className="relative" data-sidebar-drop={dropKind}>
      <div className="flex flex-col gap-1">
        <SidebarSectionHeader
          label={label}
          trailing={trailing}
          collapsed={collapsed}
          onToggle={() => toggleSidebarCollapsed(windowId, id)}
        />
        <SidebarCollapse open={!collapsed} padded={false}>
          <div className="flex flex-col gap-px">{children}</div>
        </SidebarCollapse>
      </div>
      {dropKind && <SidebarDropOutline hostRef={hostRef} active={dropActive} />}
    </div>
  );
}

function HeaderPlusButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-4 shrink-0 items-center justify-center text-[color:var(--icon-tertiary)] hover:text-[color:var(--icon-secondary)]"
    >
      <Icon name="plus" size="base" color="inherit" />
    </button>
  );
}

function NewProjectButton() {
  const windowId = useWindowId();
  const openNewProject = useUiStore((s) => s.openNewProject);
  return <HeaderPlusButton label="New project" onClick={() => openNewProject(windowId)} />;
}

function NewAgentButton() {
  const windowId = useWindowId();
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  return <HeaderPlusButton label="New agent" onClick={() => createAgent(windowId)} />;
}

function ProjectsSection() {
  const agents = useWorkspaceStore((s) => s.agents);
  const projectOrder = useWorkspaceStore((s) => s.projectOrder);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const projects = useMemo(
    () =>
      projectOrder
        .map((pid) => agents[pid])
        .filter(
          (a): a is Agent =>
            !!a && isProject(a) && !a.draft && !isAgentPinned(pinnedAgents, a.id),
        ),
    [agents, pinnedAgents, projectOrder],
  );
  const draggingProject = useTabDragStore((s) => {
    const id = s.source?.agentId;
    if (!id || s.source?.tabId) return false;
    const agent = useWorkspaceStore.getState().agents[id];
    return !!agent && isProject(agent);
  });
  return (
    <SidebarSection
      id={SIDEBAR_SECTION.projects}
      label="Projects"
      dropKind="projects"
      trailing={<NewProjectButton />}
    >
      {(projects.length > 0 || draggingProject) && <ProjectSortList projects={projects} />}
      {projects.length === 0 && !draggingProject && <ProjectsSectionNux />}
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
  if (pinned.length === 0) return null;
  return (
    <SidebarSection id={SIDEBAR_SECTION.pinned} label="Pinned" dropKind="pinned">
      {pinned.map((item, i) =>
        isTrackerOwner(item) ? (
          <ProjectGroup
            key={item.id}
            project={item}
            padded={i < pinned.length - 1}
          />
        ) : (
          <AgentList key={item.id} agents={[item]} />
        ),
      )}
    </SidebarSection>
  );
}

function RecentsList() {
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const includeProjects = useFeatureFlags((s) => s.sidebarSections) === "one";
  const list = useMemo(
    () => recentsList(agents, agentOrder, pinnedAgents, { includeProjects }),
    [agentOrder, agents, includeProjects, pinnedAgents],
  );
  return (
    <div className="flex flex-col gap-px">
      <AgentList agents={list} />
    </div>
  );
}

function WorkspaceChats() {
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const rows = useMemo(
    () =>
      chatsRows({
        workspaceOrder,
        workspaces,
        agents,
        agentOrder,
        includeProjects: true,
      }),
    [agentOrder, agents, workspaceOrder, workspaces],
  );
  return <WorkspaceSortList rows={rows} />;
}

function GroupFoldersList() {
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const groupFolderOrder = useWorkspaceStore((s) => s.groupFolderOrder);
  const list = useMemo(
    () =>
      sortTopLevelGroupFolders(
        topLevelProjectGroupItems(agents, agentOrder, workspaceOrder, pinnedAgents),
        groupFolderOrder,
      ),
    [agentOrder, agents, groupFolderOrder, pinnedAgents, workspaceOrder],
  );
  return <GroupFolderSortList folders={list} />;
}

function GroupSection({
  groupBy,
  trailing,
  oneList,
}: {
  groupBy: AgentGroupBy;
  trailing?: ReactNode;
  oneList?: boolean;
}) {
  switch (groupBy) {
    case "workspace":
      return (
        <SidebarSection
          id={SIDEBAR_SECTION.group}
          label={oneList ? "Chats" : "Workspaces"}
          trailing={trailing}
          dropKind="chats"
        >
          <WorkspaceChats />
        </SidebarSection>
      );
    case "updated":
      if (trailing || oneList) {
        return (
          <SidebarSection
            id={SIDEBAR_SECTION.group}
            label="Chats"
            trailing={trailing}
            dropKind="chats"
          >
            <RecentsList />
          </SidebarSection>
        );
      }
      return <RecentsList />;
    case "projects":
      return (
        <SidebarSection
          id={SIDEBAR_SECTION.group}
          label="Chats"
          trailing={trailing}
          dropKind="chats"
        >
          <GroupFoldersList />
        </SidebarSection>
      );
    default: {
      const _exhaustive: never = groupBy;
      return _exhaustive;
    }
  }
}

export function Sidebar() {
  const windowId = useWindowId();
  const storedGroupBy = useWindow()?.agentGroupBy ?? "workspace";
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const openCustomize = useUiStore((s) => s.openCustomize);
  const oneList = useFeatureFlags((s) => s.sidebarSections) === "one";
  // Separate already has a Projects section. Group-by Projects would hide
  // that section and keep one merged-looking list.
  const groupBy: AgentGroupBy =
    !oneList && storedGroupBy === "projects" ? "workspace" : storedGroupBy;
  const groupControls = <AgentGroupControls />;
  const listTrailing = (
    <div className="flex items-center gap-4">
      {oneList && <NewAgentButton />}
      {groupControls}
    </div>
  );
  const group = (
    <GroupSection groupBy={groupBy} oneList={oneList} trailing={listTrailing} />
  );

  return (
    <aside className="flex h-full w-full select-none flex-col bg-sidebar backdrop-blur-[12px]">
      <SidebarHeader />
      <div className="flex shrink-0 flex-col gap-px px-2 pt-1">
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

      <ScrollArea className="min-h-0 flex-1" contentClassName="gap-3 px-2 pb-3 pt-3">
        {!oneList && groupBy !== "workspace" && <ProjectsSection />}
        <PinnedSection />
        {group}
      </ScrollArea>
      <SidebarFooter />
    </aside>
  );
}
