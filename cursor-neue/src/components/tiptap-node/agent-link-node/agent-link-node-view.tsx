import type { MouseEvent } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { AgentStatusIcon } from "@/components/ui/AgentStatusIcon";
import { useWindowId } from "@/components/window/WindowContext";
import { isAgentStatus } from "@/lib/agentStatusVisual";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { AgentStatus } from "@/types";
import "./agent-link-node.scss";

function statusFromAttr(value: unknown): AgentStatus {
  return isAgentStatus(value) ? value : "idle";
}

/** Inline agent mention. Click opens the agent, same as a Kanban card. */
export function AgentLinkNodeView({ node }: NodeViewProps) {
  const windowId = useWindowId();
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
  const label = typeof node.attrs.label === "string" ? node.attrs.label : "";
  const liveStatus = useWorkspaceStore((s) => {
    const agent = s.agents[id];
    return agent && isAgentStatus(agent.status) ? agent.status : undefined;
  });
  const status = liveStatus ?? statusFromAttr(node.attrs.status);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!id) return;
    setActiveAgent(windowId, id);
  };

  return (
    <NodeViewWrapper as="span" className="agent-link-node" contentEditable={false}>
      <a
        href={`#agent/${id}`}
        className="agent-link-node__link"
        onClick={onClick}
      >
        {status === "running" && (
          <AgentStatusIcon status={status} className="agent-link-node__icon" />
        )}
        <span className="agent-link-node__label">{label}</span>
      </a>
    </NodeViewWrapper>
  );
}
