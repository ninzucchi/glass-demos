import { useMemo, useRef, type ReactNode } from "react";
import {
  isAgentPinned,
  isProject,
  pinnedAgentsFor,
  SIDEBAR_SECTION,
  sidebarCollapsed,
  type Agent,
  type AgentGroupBy,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTabDragStore } from "@/store/tabDrag";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { AgentList } from "@/components/sidebar/AgentList";
import {
  chatsRows,
  recentsBuckets,
  recentsSectionId,
  RECENTS_BUCKET_LABEL,
} from "@/components/sidebar/chatsRows";
import { ProjectGroup } from "@/components/sidebar/ProjectGroup";
import { ProjectPlaceholderRow } from "@/components/sidebar/ProjectPlaceholderRow";
import { ProjectSuggestionsCard } from "@/components/sidebar/ProjectSuggestionsCard";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { SidebarCollapse } from "@/components/sidebar/SidebarCollapse";
import { SidebarDropOutline } from "@/components/sidebar/SidebarDropOutline";
import { WorkspaceGroup } from "@/components/sidebar/WorkspaceGroup";
import { ProjectSortList } from "@/components/sidebar/ProjectSortList";
import { SidebarFooter } from "@/components/sidebar/SidebarFooter";
import { WorkspaceSortList } from "@/components/sidebar/WorkspaceSortList";
import { Icon } from "@/components/ui/Icon";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { SIDEBAR_PROJECT_PLACEHOLDERS } from "@/data/projectTemplates";
import { SEED_PROJECT_IDS } from "@/data/seed";
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
  /** Agent-row drop: pin on Pinned, unpin on Chats. Project-row drop: pin on
   *  Pinned, unpin on Projects. */
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

function NewProjectButton() {
  const windowId = useWindowId();
  const createMode = useFeatureFlags((s) => s.projectCreate);
  const openNewProject = useUiStore((s) => s.openNewProject);
  const createDraftProject = useWorkspaceStore((s) => s.createDraftProject);
  return (
    <button
      type="button"
      aria-label="New project"
      onClick={() =>
        createMode === "composer" ? createDraftProject(windowId) : openNewProject(windowId)
      }
      className="flex size-4 shrink-0 items-center justify-center text-[color:var(--icon-tertiary)] hover:text-[color:var(--icon-secondary)]"
    >
      <Icon name="plus" size="base" color="inherit" />
    </button>
  );
}

const SEED_PROJECT_ID_SET = new Set<string>(SEED_PROJECT_IDS);

function ProjectsSection() {
  const agents = useWorkspaceStore((s) => s.agents);
  const projectOrder = useWorkspaceStore((s) => s.projectOrder);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const onboarding = useFeatureFlags((s) => s.projectOnboarding);
  const onboardingNew = onboarding === "new";
  const dismissed = useUiStore((s) => s.dismissedProjectPlaceholders);
  const hintDismissed = useUiStore((s) => s.projectSuggestionsCardDismissed);
  const projects = useMemo(
    () =>
      projectOrder
        .map((pid) => agents[pid])
        .filter((a): a is Agent => {
          if (!a || !isProject(a) || a.draft || isAgentPinned(pinnedAgents, a.id)) return false;
          if (onboardingNew && SEED_PROJECT_ID_SET.has(a.id)) return false;
          return true;
        }),
    [agents, onboardingNew, pinnedAgents, projectOrder],
  );
  const placeholders = useMemo(() => {
    if (!onboardingNew) return [];
    const existing = new Set(
      Object.values(agents)
        .filter((agent) => isProject(agent) && !agent.draft && !SEED_PROJECT_ID_SET.has(agent.id))
        .map((agent) => agent.title.toLowerCase()),
    );
    const hidden = new Set(dismissed);
    return SIDEBAR_PROJECT_PLACEHOLDERS.filter(
      (item) => !hidden.has(item.id) && !existing.has(item.title.toLowerCase()),
    );
  }, [agents, dismissed, onboardingNew]);
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
      {onboardingNew && !hintDismissed && placeholders.length > 0 && (
        <ProjectSuggestionsCard />
      )}
      {(projects.length > 0 || draggingProject) && <ProjectSortList projects={projects} />}
      {placeholders.map((item) => (
        <ProjectPlaceholderRow key={item.id} item={item} />
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
    <SidebarSection id={SIDEBAR_SECTION.pinned} label="Pinned" dropKind="pinned">
      {pinned.map((item, i) =>
        isProject(item) ? (
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

function RecentsSections({ trailing }: { trailing?: ReactNode }) {
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const buckets = useMemo(
    () => recentsBuckets(agents, agentOrder, pinnedAgents),
    [agentOrder, agents, pinnedAgents],
  );
  const shown =
    buckets.length > 0 ? buckets : trailing ? [{ id: "today" as const, agents: [] }] : [];
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {shown.map((bucket, i) => (
        <SidebarSection
          key={bucket.id}
          id={recentsSectionId(bucket.id)}
          label={RECENTS_BUCKET_LABEL[bucket.id]}
          trailing={i === 0 ? trailing : undefined}
          dropKind="chats"
        >
          <AgentList agents={bucket.agents} />
        </SidebarSection>
      ))}
    </div>
  );
}

function WorkspaceChats() {
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const rows = useMemo(
    () => chatsRows({ workspaceOrder, workspaces }),
    [workspaceOrder, workspaces],
  );
  return <WorkspaceSortList rows={rows} />;
}

function GroupSection({
  groupBy,
  trailing,
}: {
  groupBy: AgentGroupBy;
  trailing?: ReactNode;
}) {
  switch (groupBy) {
    case "workspace":
      return (
        <SidebarSection
          id={SIDEBAR_SECTION.group}
          label="Workspaces"
          trailing={trailing}
          dropKind="chats"
        >
          <WorkspaceChats />
        </SidebarSection>
      );
    case "updated":
      return <RecentsSections trailing={trailing} />;
    default: {
      const _exhaustive: never = groupBy;
      return _exhaustive;
    }
  }
}

export function Sidebar() {
  const windowId = useWindowId();
  const groupBy = useWindow()?.agentGroupBy ?? "workspace";
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const openCustomize = useUiStore((s) => s.openCustomize);
  const mode = useFeatureFlags((s) => s.sidebarProjects);
  const merged = mode === "merged";
  const groupControls = <AgentGroupControls />;
  const group = (
    <GroupSection groupBy={groupBy} trailing={merged ? groupControls : undefined} />
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
        <ProjectsSection />
        {merged ? (
          <>
            <PinnedSection />
            {group}
          </>
        ) : (
          <SidebarSection id={SIDEBAR_SECTION.chats} label="Chats" trailing={groupControls}>
            <div className="flex flex-col gap-3">
              <PinnedSection />
              {group}
            </div>
          </SidebarSection>
        )}
      </ScrollArea>
      <SidebarFooter />
    </aside>
  );
}
