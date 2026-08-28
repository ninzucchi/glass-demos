import { useRef, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import {
  isAgentPinned,
  isProject,
  primaryWorkspaceId,
  PROJECT_COLOR_STROKE,
  type Agent,
} from "@/types";
import { SEED_PROJECT_IDS } from "@/data/seed";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTabDragStore, type TabDragSource } from "@/store/tabDrag";
import { useUiStore } from "@/store/useUiStore";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import {
  applySidebarAgentClick,
  applySidebarAgentDrop,
  moveAgentsIntoProject,
  sidebarAgentActionIds,
} from "@/components/sidebar/sidebarAgentSelection";
import { Icon } from "@/components/ui/Icon";
import { beginTabDrag } from "@/components/tile/tabDragInteraction";
import { isOutsideWindows, newWindowGeo } from "@/components/desktop/geometry";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const SEED_PROJECT_ID_SET = new Set<string>(SEED_PROJECT_IDS);

interface AgentCellProps {
  agent: Agent;
  selected: boolean;
  nested?: boolean;
  nestLevel?: number;
  demoteOnHide?: boolean;
}

/** An agent row in the sidebar. Right-click or drag onto Pinned / Chats /
 *  a project to pin, unpin, or re-parent. Dragging also opens the agent on a
 *  chat tile, the chat panel edge, or a new window over the desktop. */
export function AgentCell({ agent, selected, nested, nestLevel, demoteOnHide }: AgentCellProps) {
  const windowId = useWindowId();
  const activeAgentId = useWindow()?.activeAgentId;
  const archiveAgent = useWorkspaceStore((s) => s.archiveAgent);
  const togglePinnedAgent = useWorkspaceStore((s) => s.togglePinnedAgent);
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  const setAgentElevated = useWorkspaceStore((s) => s.setAgentElevated);
  const pinned = useWorkspaceStore((s) => isAgentPinned(s.pinnedAgents, agent.id));
  const agents = useWorkspaceStore((s) => s.agents);
  const projectOrder = useWorkspaceStore((s) => s.projectOrder);
  const createDraftProject = useWorkspaceStore((s) => s.createDraftProject);
  const openNewProject = useUiStore((s) => s.openNewProject);
  const setPendingMoveAgentIds = useUiStore((s) => s.setPendingMoveAgentIds);
  const createMode = useFeatureFlags((s) => s.projectCreate);
  const onboardingNew = useFeatureFlags((s) => s.projectOnboarding) === "new";
  const projects = useMemo(
    () =>
      projectOrder
        .map((id) => agents[id])
        .filter((p): p is Agent => {
          if (!p || !isProject(p) || p.draft) return false;
          if (onboardingNew && SEED_PROJECT_ID_SET.has(p.id)) return false;
          return true;
        }),
    [agents, onboardingNew, projectOrder],
  );
  const openAgentInTile = useWorkspaceStore((s) => s.openAgentInTile);
  const openAgentAtChatRoot = useWorkspaceStore((s) => s.openAgentAtChatRoot);
  const openAgentInNewWindow = useWorkspaceStore((s) => s.openAgentInNewWindow);
  const dragging = useTabDragStore((s) => {
    const ids = s.source?.agentIds ?? (s.source?.agentId ? [s.source.agentId] : []);
    return ids.includes(agent.id);
  });
  // Suppress the click-to-select that fires right after a drag ends.
  const didDragRef = useRef(false);

  const actionIds = () => sidebarAgentActionIds(windowId, agent.id);

  const pinSelection = () => {
    const shouldPin = !pinned;
    for (const id of actionIds()) {
      const live = useWorkspaceStore.getState();
      if (isAgentPinned(live.pinnedAgents, id) !== shouldPin) {
        live.togglePinnedAgent(id);
      }
    }
  };

  const archiveSelection = () => {
    const ids = actionIds();
    for (const id of ids) archiveAgent(id);
    const cur = useUiStore.getState().sidebarAgentSelection[windowId];
    if (!cur) return;
    const remaining = cur.ids.filter((id) => !ids.includes(id));
    useUiStore.getState().setSidebarAgentSelection(windowId, {
      ids: remaining,
      anchorId:
        cur.anchorId && remaining.includes(cur.anchorId)
          ? cur.anchorId
          : remaining[0] ?? null,
    });
  };

  const moveSelectionToProject = (projectId: string) => {
    moveAgentsIntoProject(windowId, actionIds(), projectId);
  };

  const moveSelectionToNewProject = () => {
    const ids = actionIds();
    setPendingMoveAgentIds(ids);
    switch (createMode) {
      case "composer": {
        const projectId = createDraftProject(windowId, primaryWorkspaceId(agent));
        if (projectId) moveAgentsIntoProject(windowId, ids, projectId);
        setPendingMoveAgentIds(null);
        return;
      }
      case "advanced":
      case "modal":
      case "suggestions":
        openNewProject(windowId);
        return;
      default: {
        const _exhaustive: never = createMode;
        return _exhaustive;
      }
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) =>
    beginTabDrag(e, {
      createSource: (): TabDragSource => {
        const ids = sidebarAgentActionIds(windowId, agent.id);
        return {
          tileId: "",
          tabId: "",
          title: agent.title,
          icon: "agent",
          pane: "chat",
          tabType: "chat",
          agentId: agent.id,
          agentIds: ids,
        };
      },
      suppressSelfTile: false,
      didDragRef,
      onDrop: (source, target, pointer) => {
        const ids = source.agentIds?.length ? source.agentIds : [agent.id];
        if (target?.scope === "sidebar-project") {
          moveAgentsIntoProject(windowId, ids, target.projectId);
          return;
        }
        if (target?.scope === "sidebar-section") {
          switch (target.section) {
            case "pinned":
              applySidebarAgentDrop(windowId, ids, { kind: "pinned" });
              break;
            case "chats":
              applySidebarAgentDrop(windowId, ids, { kind: "chats" });
              break;
            case "projects":
              break;
            default: {
              const _exhaustive: never = target.section;
              return _exhaustive;
            }
          }
          return;
        }
        if (target) {
          if (target.scope === "tile") {
            openAgentInTile(agent.id, target.tileId, target.zone);
          } else if (target.scope === "chat-root") {
            openAgentAtChatRoot(agent.id, target.windowId, target.side);
          }
        } else if (isOutsideWindows(pointer.x, pointer.y)) {
          openAgentInNewWindow(agent.id, newWindowGeo(pointer));
        }
      },
    });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-sidebar-agent-id={agent.id}
          className={clsx(dragging && "opacity-40")}
        >
          <SidebarCell
            label={agent.title}
            leading={{ kind: "agent", status: agent.status }}
            selected={selected}
            nested={nested}
            nestLevel={nestLevel}
            onHideClick={
              demoteOnHide ? () => setAgentElevated(agent.id, false) : undefined
            }
            onPointerDown={onPointerDown}
            onClick={(e) => {
              if (didDragRef.current) {
                didDragRef.current = false;
                return;
              }
              applySidebarAgentClick({
                windowId,
                agentId: agent.id,
                event: e,
                fromEl: e.currentTarget,
                activeAgentId,
                setActiveAgent,
              });
            }}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuSection>
          <ContextMenuItem onSelect={pinSelection}>
            <Icon name={pinned ? "pin-slash" : "pin"} size="base" color="tertiary" />
            {pinned ? "Unpin" : "Pin"}
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Icon name="folder" size="base" color="tertiary" />
              Move to Project...
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuSection>
                <ContextMenuItem onSelect={moveSelectionToNewProject}>
                  <Icon name="plus" size="base" color="tertiary" />
                  New Project
                </ContextMenuItem>
              </ContextMenuSection>
              {projects.length > 0 && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuSection>
                    {projects.map((project) => (
                      <ContextMenuItem
                        key={project.id}
                        onSelect={() => moveSelectionToProject(project.id)}
                      >
                        <Icon
                          name={project.icon ?? "pencil"}
                          size="base"
                          color="inherit"
                          style={{
                            color: PROJECT_COLOR_STROKE[project.color ?? "blue"],
                          }}
                        />
                        {project.title}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSection>
                </>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuSection>
        <ContextMenuSeparator />
        <ContextMenuSection>
          <ContextMenuItem onSelect={archiveSelection}>
            <Icon name="archive" size="base" color="tertiary" />
            Archive
          </ContextMenuItem>
        </ContextMenuSection>
      </ContextMenuContent>
    </ContextMenu>
  );
}
