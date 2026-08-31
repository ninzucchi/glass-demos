import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import {
  elevatedAgentsInProject,
  isAgentPinned,
  isProject,
  primaryWorkspaceId,
  projectWorkspaceIds,
  sidebarCollapsed,
  type Agent,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { projectFolderCollapsible, useFeatureFlags } from "@/store/useFeatureFlags";
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

const VISIBLE = 3;

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
  const activeAgent = activeAgentId ? agents[activeAgentId] : undefined;
  const projectSelected =
    project.id === activeAgentId ||
    (!!activeAgent && !isProject(activeAgent) && activeAgent.projectId === project.id);
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const togglePinnedAgent = useWorkspaceStore((s) => s.togglePinnedAgent);
  const archiveAgent = useWorkspaceStore((s) => s.archiveAgent);
  const moveProject = useWorkspaceStore((s) => s.moveProject);
  const toggleSidebarCollapsed = useWorkspaceStore((s) => s.toggleSidebarCollapsed);
  const openAgentInTile = useWorkspaceStore((s) => s.openAgentInTile);
  const openAgentAtChatRoot = useWorkspaceStore((s) => s.openAgentAtChatRoot);
  const openAgentInNewWindow = useWorkspaceStore((s) => s.openAgentInNewWindow);
  const collapsed = sidebarCollapsed(project.id, win?.collapsedSidebar);
  const foldersMode = useFeatureFlags((s) => s.projectFolders);
  const pinned = isAgentPinned(pinnedAgents, project.id);
  const dragging = useTabDragStore((s) => s.source?.agentId === project.id);
  const didDragRef = useRef(false);
  const [seeMore, setSeeMore] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const openEditProject = useUiStore((s) => s.openEditProject);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) =>
    beginTabDrag(e, {
      createSource: () => ({
        tileId: "",
        tabId: "",
        title: project.title,
        icon: project.icon ?? "folder",
        pane: "chat",
        tabType: "chat",
        agentId: project.id,
      }),
      suppressSelfTile: false,
      didDragRef,
      onDrop: (_source, target, pointer) => {
        if (target?.scope === "sidebar-project") return;
        if (target?.scope === "sidebar-section") {
          const pinnedNow = isAgentPinned(
            useWorkspaceStore.getState().pinnedAgents,
            project.id,
          );
          if (target.section === "pinned" && !pinnedNow) togglePinnedAgent(project.id);
          else if (
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
        const listIndex = useTabDragStore.getState().listIndex;
        if (listIndex != null) {
          moveProject(project.id, listIndex);
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

  const children = useMemo(
    () => elevatedAgentsInProject(agents, agentOrder, project.id),
    [agents, agentOrder, project.id],
  );
  const list = useMemo(
    () => children.filter((a) => pinned || !isAgentPinned(pinnedAgents, a.id)),
    [children, pinned, pinnedAgents],
  );
  const collapsible = projectFolderCollapsible(foldersMode, list.length);

  const shown = seeMore ? list : list.slice(0, VISIBLE);
  const showMore = !seeMore && list.length > VISIBLE;
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
                  label={project.title}
                  leading={{
                    kind: "project",
                    collapsed,
                    icon: project.icon ?? "pencil",
                    color: project.color ?? "blue",
                    collapsible,
                  }}
                  nestLevel={nestLevel}
                  selected={projectSelected}
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
                            projectId: project.id,
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
            <ContextMenuItem onSelect={() => openEditProject(windowId, project.id)}>
              <Icon name="pencil" size="base" color="tertiary" />
              Edit
            </ContextMenuItem>
          </ContextMenuSection>
          <ContextMenuSeparator />
          <ContextMenuSection>
            <ContextMenuItem onSelect={() => archiveAgent(project.id)}>
              <Icon name="trash" size="base" color="tertiary" />
              Delete
            </ContextMenuItem>
          </ContextMenuSection>
        </ContextMenuContent>
      </ContextMenu>
      {collapsible && (
        <SidebarCollapse open={!collapsed} padded={padded}>
          <div className="flex flex-col gap-px">
            <AgentList
              agents={shown}
              nestLevel={nestLevel + 1}
              demoteOnHide
            />
            {showMore && (
              <SidebarCell
                muted
                nestLevel={nestLevel + 1}
                label="See more"
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
