import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import {
  agentsInProject,
  isAgentPinned,
  primaryWorkspaceId,
  projectWorkspaceIds,
  sidebarCollapsed,
  type Agent,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTabDragStore } from "@/store/tabDrag";
import { isFlatLike, useFeatureFlags } from "@/store/useFeatureFlags";
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
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const togglePinnedAgent = useWorkspaceStore((s) => s.togglePinnedAgent);
  const moveProject = useWorkspaceStore((s) => s.moveProject);
  const moveSidebarFolder = useWorkspaceStore((s) => s.moveSidebarFolder);
  const toggleSidebarCollapsed = useWorkspaceStore((s) => s.toggleSidebarCollapsed);
  const openAgentInTile = useWorkspaceStore((s) => s.openAgentInTile);
  const openAgentAtChatRoot = useWorkspaceStore((s) => s.openAgentAtChatRoot);
  const openAgentInNewWindow = useWorkspaceStore((s) => s.openAgentInNewWindow);
  const collapsed = sidebarCollapsed(project.id, win?.collapsedSidebar);
  const pinned = isAgentPinned(pinnedAgents, project.id);
  const dragging = useTabDragStore((s) => s.source?.agentId === project.id);
  const didDragRef = useRef(false);
  const [seeMore, setSeeMore] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

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
            const listIndex = useTabDragStore.getState().listIndex;
            if (listIndex != null && useFeatureFlags.getState().sidebarProjects === "flat") {
              moveSidebarFolder(project.id, listIndex);
            } else if (listIndex != null && !isFlatLike(useFeatureFlags.getState().sidebarProjects)) {
              moveProject(project.id, listIndex);
            }
          }
          return;
        }
        const listIndex = useTabDragStore.getState().listIndex;
        if (listIndex != null && useFeatureFlags.getState().sidebarProjects === "flat") {
          moveSidebarFolder(project.id, listIndex);
          return;
        }
        if (listIndex != null && !isFlatLike(useFeatureFlags.getState().sidebarProjects)) {
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

  const list = useMemo(
    () =>
      agentsInProject(agents, agentOrder, project.id).filter(
        (a) => pinned || !isAgentPinned(pinnedAgents, a.id),
      ),
    [agents, agentOrder, pinned, pinnedAgents, project.id],
  );

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
      data-sidebar-flip={`project:${project.id}`}
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
                  }}
                  nestLevel={nestLevel}
                  selected={project.id === activeAgentId}
                  onPointerDown={onPointerDown}
                  onClick={() => {
                    if (didDragRef.current) {
                      didDragRef.current = false;
                      return;
                    }
                    setActiveAgent(windowId, project.id);
                  }}
                  onLeadingClick={() => toggleSidebarCollapsed(windowId, project.id)}
                  onAddClick={() => {
                    createAgent(windowId, {
                      workspaceId:
                        projectWorkspaceIds(project.id, agents, agentOrder)[0] ??
                        primaryWorkspaceId(project),
                      projectId: project.id,
                    });
                  }}
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
          </ContextMenuSection>
        </ContextMenuContent>
      </ContextMenu>
      <SidebarCollapse open={!collapsed} padded={padded}>
        <div className="flex flex-col gap-px">
          <AgentList agents={shown} nestLevel={nestLevel + 1} />
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
      <SidebarDropOutline hostRef={hostRef} active={dropActive} />
    </div>
  );
}
