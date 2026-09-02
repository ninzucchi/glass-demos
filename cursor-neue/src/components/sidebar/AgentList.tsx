import { isTrackerOwner, type Agent } from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow } from "@/store/useWorkspaceStore";
import { useUiStore } from "@/store/useUiStore";
import { AgentCell } from "@/components/sidebar/AgentCell";
import { ProjectGroup } from "@/components/sidebar/ProjectGroup";

/** A flat list of agent rows. Highlight follows the sidebar multi-select when
 *  it is non-empty; otherwise it follows the window's active agent. */
export function AgentList({
  agents,
  nested,
  nestLevel,
  demoteOnHide = false,
}: {
  agents: Agent[];
  nested?: boolean;
  nestLevel?: number;
  /** Folders mode: show a hover X that hides the row. */
  demoteOnHide?: boolean;
}) {
  const windowId = useWindowId();
  const activeAgentId = useWindow()?.activeAgentId;
  const selectedIds = useUiStore((s) => s.sidebarAgentSelection[windowId]?.ids);
  const multi = (selectedIds?.length ?? 0) > 1;
  return (
    <>
      {agents.map((a, i) =>
        isTrackerOwner(a) ? (
          <ProjectGroup
            key={a.id}
            project={a}
            padded={i < agents.length - 1}
            nestLevel={nestLevel ?? (nested ? 1 : 0)}
          />
        ) : (
          <AgentCell
            key={a.id}
            agent={a}
            selected={multi ? selectedIds.includes(a.id) : a.id === activeAgentId}
            nested={nested}
            nestLevel={nestLevel}
            demoteOnHide={demoteOnHide}
          />
        ),
      )}
    </>
  );
}
