import type { Agent } from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { AgentCell } from "@/components/sidebar/AgentCell";

/** A flat list of agent rows wired to the current window's active selection.
 *  Shared leaf for every sidebar grouping (workspace folders, recency sections,
 *  standalone agents) so the active-agent wiring lives in exactly one place. */
export function AgentList({ agents }: { agents: Agent[] }) {
  const windowId = useWindowId();
  const activeAgentId = useWindow()?.activeAgentId;
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  return (
    <>
      {agents.map((a) => (
        <AgentCell
          key={a.id}
          agent={a}
          selected={a.id === activeAgentId}
          onSelect={() => setActiveAgent(windowId, a.id)}
        />
      ))}
    </>
  );
}
