import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import {
  agentsInGroup,
  agentsInProject,
  elevatedAgentsInProject,
  focusAgentsInGroup,
  groupsInParent,
  isAgentPinned,
  isProject,
  isWorkspace,
  primaryWorkspaceId,
  projectWorkspaceIds,
  sidebarCollapsed,
  sortSidebarFolderItems,
  type Agent,
} from "@/types";
import { titleCaseFolderName } from "@/lib/titleCase";
import { useWindowId } from "@/components/window/WindowContext";
import { projectFolderCollapsible, useFeatureFlags, useMergedSidebar } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTabDragStore } from "@/store/tabDrag";
import { beginTabDrag } from "@/components/tile/tabDragInteraction";
import { isOutsideWindows, newWindowGeo } from "@/components/desktop/geometry";
import { AgentList } from "@/components/sidebar/AgentList";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { SidebarCollapse } from "@/components/sidebar/SidebarCollapse";
import { SidebarDropOutline } from "@/components/sidebar/SidebarDropOutline";
import { Icon } from "@/components/ui/Icon";
import {
  SidebarWorkspaceTooltip,
  workspaceNamesInOrder,
} from "@/components/sidebar/SidebarWorkspaceTooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const FOLDERS_VISIBLE = 5;
const FOCUS_VISIBLE = 3;
/** Focus Folders: More only when it would reveal at least two extra agents. */
const FOCUS_MORE_AT = FOCUS_VISIBLE + 2;

/** A project row: folder chrome plus the project's own chat (click opens it).
 *  Nested agents live here instead of Chats. */
export function ProjectGroup({
  project,
  padded = true,
  nestLevel = 0,
}: {
  project: Agent;
  /** False when this folder is the last row in its section. */
  padded?: boolean;
  /** Indent of this folder row. Children sit one level deeper. */
  nestLevel?: number;
}) {
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const windowId = useWindowId();
  const win = useWindow();
  const activeAgentId = win?.activeAgentId;
  const projectSelected = project.id === activeAgentId;
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const updateAgentMeta = useWorkspaceStore((s) => s.updateAgentMeta);
  const togglePinnedAgent = useWorkspaceStore((s) => s.togglePinnedAgent);
  const archiveAgent = useWorkspaceStore((s) => s.archiveAgent);
  const moveProject = useWorkspaceStore((s) => s.moveProject);
  const moveGroupFolder = useWorkspaceStore((s) => s.moveGroupFolder);
  const moveGroup = useWorkspaceStore((s) => s.moveGroup);
  const toggleSidebarCollapsed = useWorkspaceStore((s) => s.toggleSidebarCollapsed);
  const openAgentInTile = useWorkspaceStore((s) => s.openAgentInTile);
  const openAgentAtChatRoot = useWorkspaceStore((s) => s.openAgentAtChatRoot);
  const openAgentInNewWindow = useWorkspaceStore((s) => s.openAgentInNewWindow);
  const collapsed = sidebarCollapsed(
    project.id,
    win?.collapsedSidebar,
    isWorkspace(project) ? (workspaces[project.id]?.collapsed ?? false) : false,
  );
  const foldersMode = useFeatureFlags((s) => s.projectFolders);
  const merged = useMergedSidebar();
  const pinned = isAgentPinned(pinnedAgents, project.id);
  const dragging = useTabDragStore((s) => s.source?.agentId === project.id);
  const didDragRef = useRef(false);
  const [seeMore, setSeeMore] = useState(false);
  // Collapse keeps children mounted for the close animation. Reset More after
  // that 200ms so the next open shows the first page again.
  useEffect(() => {
    if (!collapsed) return;
    const id = window.setTimeout(() => setSeeMore(false), 200);
    return () => window.clearTimeout(id);
  }, [collapsed]);
  const hostRef = useRef<HTMLDivElement>(null);
  const openEditProject = useUiStore((s) => s.openEditProject);
  const projectsMode = (win?.agentGroupBy ?? "workspace") === "projects";
  const repoFolder = isWorkspace(project);
  const folderLabel =
    repoFolder && projectsMode ? titleCaseFolderName(project.title) : project.title;

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) =>
    beginTabDrag(e, {
      createSource: () => ({
        tileId: "",
        tabId: "",
        title: folderLabel,
        icon: project.icon ?? "folder",
        pane: "chat",
        tabType: "chat",
        agentId: project.id,
      }),
      suppressSelfTile: false,
      didDragRef,
      onDrop: (_source, target, pointer) => {
        if (target?.scope === "sidebar-project") {
          moveGroup(windowId, project.id, target.projectId);
          return;
        }
        if (target?.scope === "sidebar-section") {
          const pinnedNow = isAgentPinned(
            useWorkspaceStore.getState().pinnedAgents,
            project.id,
          );
          if (target.section === "pinned" && !pinnedNow) togglePinnedAgent(project.id);
          else if (target.section === "chats" && !pinnedNow) {
            const drag = useTabDragStore.getState();
            if (drag.listIndex != null && drag.listScope === "group-folder-order") {
              moveGroupFolder(project.id, drag.listIndex);
            } else {
              moveGroup(windowId, project.id, null);
            }
          } else if (
            (target.section === "projects" || target.section === "chats") &&
            pinnedNow
          ) {
            togglePinnedAgent(project.id);
            if (target.section === "projects") {
              const listIndex = useTabDragStore.getState().listIndex;
              if (listIndex != null) moveProject(project.id, listIndex);
            }
          }
          return;
        }
        const drag = useTabDragStore.getState();
        if (drag.listIndex != null) {
          if (drag.listScope === "group-folder-order") {
            moveGroupFolder(project.id, drag.listIndex);
          } else {
            moveProject(project.id, drag.listIndex);
          }
          return;
        }
        if (target) {
          if (target.scope === "tile") {
            openAgentInTile(project.id, target.tileId, target.zone);
          } else if (target.scope === "chat-root") {
            openAgentAtChatRoot(project.id, target.windowId, target.side);
          }
        } else if (isOutsideWindows(pointer.x, pointer.y)) {
          openAgentInNewWindow(project.id, newWindowGeo(pointer));
        }
      },
    });
  const dropActive = useTabDragStore(
    (s) => s.target?.scope === "sidebar-project" && s.target.projectId === project.id,
  );

  const children = useMemo(() => {
    const nested = groupsInParent(agents, project.id);
    // Repo folders list loose chats only. Projects stay top-level unless
    // the user nests them. Focus Folders / Agents only change project rows.
    let members: Agent[];
    if (repoFolder) {
      members = agentsInGroup(agents, agentOrder, project.id);
    } else {
      switch (foldersMode) {
        case "folders":
          members = projectsMode
            ? agentsInGroup(agents, agentOrder, project.id)
            : agentsInProject(agents, agentOrder, project.id);
          break;
        case "focus":
          members = projectsMode
            ? focusAgentsInGroup(agents, agentOrder, project.id)
            : elevatedAgentsInProject(agents, agentOrder, project.id);
          break;
        case "agents":
          members = [];
          break;
        default: {
          const _exhaustive: never = foldersMode;
          return _exhaustive;
        }
      }
    }
    return [...nested, ...members];
  }, [agentOrder, agents, foldersMode, project.id, projectsMode, repoFolder]);
  const list = useMemo(
    () =>
      sortSidebarFolderItems(
        children.filter((a) => pinned || !isAgentPinned(pinnedAgents, a.id)),
        agents,
        agentOrder,
      ),
    [agentOrder, agents, children, pinned, pinnedAgents],
  );
  const collapsible = repoFolder
    ? true
    : projectFolderCollapsible(foldersMode, list.length);
  const demoteOnHide = !repoFolder && foldersMode === "focus";

  const visible = foldersMode === "folders" ? FOLDERS_VISIBLE : FOCUS_VISIBLE;
  const truncated =
    foldersMode === "folders" ? list.length > visible : list.length >= FOCUS_MORE_AT;
  const shown = seeMore || !truncated ? list : list.slice(0, visible);
  const showMore = !seeMore && truncated;
  const workspaceNames = useMemo(
    () =>
      workspaceNamesInOrder(
        projectWorkspaceIds(project.id, agents, agentOrder),
        workspaceOrder,
        workspaces,
      ),
    [agents, agentOrder, project.id, workspaceOrder, workspaces],
  );

  return (
    <div
      ref={hostRef}
      className={clsx("relative flex flex-col gap-px", dragging && "opacity-40")}
      data-sidebar-drop="project"
      data-sidebar-project-id={project.id}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>
            <SidebarWorkspaceTooltip names={workspaceNames}>
              <div>
                <SidebarCell
                  label={folderLabel}
                  leading={
                    isWorkspace(project)
                      ? { kind: "workspace", collapsed, hitTarget: merged }
                      : {
                          kind: "project",
                          collapsed,
                          icon: project.icon ?? "pencil",
                          color: project.color ?? "blue",
                          collapsible,
                        }
                  }
                  nestLevel={nestLevel}
                  selected={projectSelected}
                  onRename={
                    isProject(project) || (repoFolder && !!workspaces[project.id])
                      ? (title) => updateAgentMeta(project.id, { title })
                      : undefined
                  }
                  onPointerDown={onPointerDown}
                  onClick={() => {
                    if (didDragRef.current) {
                      didDragRef.current = false;
                      return;
                    }
                    useUiStore.getState().setSidebarAgentSelection(windowId, {
                      ids: [],
                      anchorId: project.id,
                    });
                    setActiveAgent(windowId, project.id);
                  }}
                  onLeadingClick={
                    collapsible
                      ? () => toggleSidebarCollapsed(windowId, project.id)
                      : undefined
                  }
                  onAddClick={
                    collapsible
                      ? () => {
                          createAgent(windowId, {
                            workspaceId:
                              projectWorkspaceIds(project.id, agents, agentOrder)[0] ??
                              primaryWorkspaceId(project),
                            projectId: isProject(project) ? project.id : undefined,
                            groupParentId: project.id,
                          });
                        }
                      : undefined
                  }
                />
              </div>
            </SidebarWorkspaceTooltip>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSection>
            <ContextMenuItem onSelect={() => togglePinnedAgent(project.id)}>
              <Icon name={pinned ? "pin-slash" : "pin"} size="base" color="tertiary" />
              {pinned ? "Unpin" : "Pin"}
            </ContextMenuItem>
            {isProject(project) && (
              <ContextMenuItem onSelect={() => openEditProject(windowId, project.id)}>
                <Icon name="pencil" size="base" color="tertiary" />
                Edit
              </ContextMenuItem>
            )}
          </ContextMenuSection>
          {isProject(project) && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSection>
                <ContextMenuItem onSelect={() => archiveAgent(project.id)}>
                  <Icon
                    name={merged ? "folder-open" : "trash"}
                    size="base"
                    color="tertiary"
                  />
                  {merged ? "Ungroup" : "Delete"}
                </ContextMenuItem>
              </ContextMenuSection>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {collapsible && (
        <SidebarCollapse
          open={!collapsed}
          padded={padded && nestLevel === 0}
          threadParentLevel={merged && !projectsMode ? nestLevel : undefined}
        >
          <div className="flex flex-col gap-px">
            <AgentList
              agents={shown}
              nestLevel={nestLevel + 1}
              demoteOnHide={demoteOnHide}
            />
            {showMore && (
              <SidebarCell
                muted
                nestLevel={nestLevel + 1}
                label="More"
                onClick={() => setSeeMore(true)}
              />
            )}
          </div>
        </SidebarCollapse>
      )}
      <SidebarDropOutline hostRef={hostRef} active={dropActive} />
    </div>
  );
}
