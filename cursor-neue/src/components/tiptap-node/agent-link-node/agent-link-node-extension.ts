import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { AgentLinkNodeView } from "@/components/tiptap-node/agent-link-node/agent-link-node-view";
import { isAgentStatus } from "@/lib/agentStatusVisual";
import { titleCaseName } from "@/lib/titleCase";
import type { Agent, AgentStatus } from "@/types";

export type AgentLinkAttrs = {
  id: string;
  label: string;
  status: AgentStatus;
};

/** Mention-style inline atom. Stores an agent id and opens like a board card. */
export const AgentLink = Node.create({
  name: "agentLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-id") ?? "",
        renderHTML: (attributes) => ({ "data-id": attributes.id }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-label") ?? element.textContent ?? "",
        renderHTML: (attributes) => ({ "data-label": attributes.label }),
      },
      status: {
        default: "idle" satisfies AgentStatus,
        parseHTML: (element) => {
          const value = element.getAttribute("data-status");
          return isAgentStatus(value) ? value : "idle";
        },
        renderHTML: (attributes) => ({ "data-status": attributes.status }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="agentLink"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
    const label = typeof node.attrs.label === "string" ? node.attrs.label : "";
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "agentLink",
        href: `#agent/${id}`,
      }),
      label,
    ];
  },

  renderText({ node }) {
    return typeof node.attrs.label === "string" ? node.attrs.label : "";
  },

  addNodeView() {
    return ReactNodeViewRenderer(AgentLinkNodeView, {
      as: "span",
      stopEvent: ({ event }) =>
        event.type === "click" || event.type === "mousedown" || event.type === "mouseup",
    });
  },
});

export function agentLinkNode(agent: Agent, mention = false): JSONContent {
  const name = titleCaseName(agent.title);
  return {
    type: "agentLink",
    attrs: {
      id: agent.id,
      label: mention ? `@${name}` : name,
      status: agent.status,
    } satisfies AgentLinkAttrs,
  };
}

export default AgentLink;
