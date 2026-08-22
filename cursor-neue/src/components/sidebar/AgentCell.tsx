import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import { isAgentPinned, type Agent } from "@/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTabDragStore } from "@/store/tabDrag";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
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
}

/** An agent row in the sidebar. Right-click pins or unpins (sidebar list only)
 *  and archives. Dragging the row opens the agent wherever it lands:
 *  a chat tile (merge/split), the chat panel's outer edge (full-span pane), or a
 *  new window when released over the desktop — a CREATE drag like a Files row,
 *  pane-fenced to chat targets by the shared placement policy. */
export function AgentCell({ agent, selected, onSelect, nested }: AgentCellProps) {
  const archiveAgent = useWorkspaceStore((s) => s.archiveAgent);
  const togglePinnedAgent = useWorkspaceStore((s) => s.togglePinnedAgent);
  const pinned = useWorkspaceStore((s) => isAgentPinned(s.pinnedAgents, agent.id));
  const openAgentInTile = useWorkspaceStore((s) => s.openAgentInTile);
  const openAgentAtChatRoot = useWorkspaceStore((s) => s.openAgentAtChatRoot);
  const openAgentInNewWindow = useWorkspaceStore((s) => s.openAgentInNewWindow);
  const dragging = useTabDragStore((s) => s.source?.agentId === agent.id);
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
        <div className={clsx(dragging && "opacity-40")}>
          <SidebarCell
            label={agent.title}
            leading={{ kind: "agent", status: agent.status }}
            selected={selected}
            nested={nested}
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
