import { useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import { isAgentPinned, type Agent } from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTabDragStore } from "@/store/tabDrag";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import {
  SidebarWorkspaceTooltip,
  workspaceNamesInOrder,
} from "@/components/sidebar/SidebarWorkspaceTooltip";
import { Icon } from "@/components/ui/Icon";
import { beginTabDrag } from "@/components/tile/tabDragInteraction";
import { isOutsideWindows, newWindowGeo } from "@/components/desktop/geometry";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface AgentCellProps {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
  nested?: boolean;
  nestLevel?: number;
}

/** An agent row in the sidebar. Right-click or drag onto Pinned / Chats /
 *  a project to pin, unpin, or re-parent. Dragging also opens the agent on a
 *  chat tile, the chat panel edge, or a new window over the desktop. */
export function AgentCell({ agent, selected, onSelect, nested, nestLevel }: AgentCellProps) {
  const windowId = useWindowId();
  const archiveAgent = useWorkspaceStore((s) => s.archiveAgent);
  const togglePinnedAgent = useWorkspaceStore((s) => s.togglePinnedAgent);
  const moveAgentToProject = useWorkspaceStore((s) => s.moveAgentToProject);
  const pinned = useWorkspaceStore((s) => isAgentPinned(s.pinnedAgents, agent.id));
  const openAgentInTile = useWorkspaceStore((s) => s.openAgentInTile);
  const openAgentAtChatRoot = useWorkspaceStore((s) => s.openAgentAtChatRoot);
  const openAgentInNewWindow = useWorkspaceStore((s) => s.openAgentInNewWindow);
  const dragging = useTabDragStore((s) => s.source?.agentId === agent.id);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const workspaceNames = useMemo(
    () => workspaceNamesInOrder(agent.workspaceIds, workspaceOrder, workspaces),
    [agent.workspaceIds, workspaceOrder, workspaces],
  );
  // Suppress the click-to-select that fires right after a drag ends.
  const didDragRef = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) =>
    beginTabDrag(e, {
      createSource: () => ({
        tileId: "",
        tabId: "",
        title: agent.title,
        icon: "agent",
        pane: "chat",
        tabType: "chat",
        agentId: agent.id,
      }),
      suppressSelfTile: false,
      didDragRef,
      onDrop: (_source, target, pointer) => {
        if (target?.scope === "sidebar-project") {
          moveAgentToProject(windowId, agent.id, target.projectId);
          return;
        }
        if (target?.scope === "sidebar-section") {
          const live = useWorkspaceStore.getState();
          const pinnedNow = isAgentPinned(live.pinnedAgents, agent.id);
          if (target.section === "pinned" && !pinnedNow) togglePinnedAgent(agent.id);
          else if (target.section === "chats") {
            if (pinnedNow) togglePinnedAgent(agent.id);
            else if (live.agents[agent.id]?.projectId) {
              moveAgentToProject(windowId, agent.id, null);
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
        <div data-sidebar-flip={`agent:${agent.id}`} className={clsx(dragging && "opacity-40")}>
          <SidebarWorkspaceTooltip names={workspaceNames}>
            <div>
              <SidebarCell
                label={agent.title}
                leading={{ kind: "agent", status: agent.status }}
                selected={selected}
                nested={nested}
                nestLevel={nestLevel}
                onPointerDown={onPointerDown}
                onClick={() => {
                  if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                  }
                  onSelect();
                }}
              />
            </div>
          </SidebarWorkspaceTooltip>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuSection>
          <ContextMenuItem onSelect={() => togglePinnedAgent(agent.id)}>
            <Icon name={pinned ? "pin-slash" : "pin"} size="base" color="tertiary" />
            {pinned ? "Unpin" : "Pin"}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => archiveAgent(agent.id)}>
            <Icon name="archive" size="base" color="tertiary" />
            Archive
          </ContextMenuItem>
        </ContextMenuSection>
      </ContextMenuContent>
    </ContextMenu>
  );
}
