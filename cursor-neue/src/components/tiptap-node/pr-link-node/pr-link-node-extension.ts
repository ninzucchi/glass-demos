import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PrLinkNodeView } from "@/components/tiptap-node/pr-link-node/pr-link-node-view";
import type { PrState, PullRequest } from "@/data/pullRequests";
import { isPrState } from "@/lib/prStateVisual";

export type PrLinkAttrs = {
  id: string;
  label: string;
  state: PrState;
};

/** Mention-style inline atom. Stores a PR id and opens that PR's tab. */
export const PrLink = Node.create({
  name: "prLink",
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
      state: {
        default: "open" satisfies PrState,
        parseHTML: (element) => {
          const value = element.getAttribute("data-state");
          return isPrState(value) ? value : "open";
        },
        renderHTML: (attributes) => ({ "data-state": attributes.state }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="prLink"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
    const label = typeof node.attrs.label === "string" ? node.attrs.label : "";
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "prLink",
        href: `#pr/${id}`,
      }),
      label,
    ];
  },

  renderText({ node }) {
    return typeof node.attrs.label === "string" ? node.attrs.label : "";
  },

  addNodeView() {
    return ReactNodeViewRenderer(PrLinkNodeView, {
      as: "span",
      stopEvent: ({ event }) =>
        event.type === "click" || event.type === "mousedown" || event.type === "mouseup",
    });
  },
});

export function prLinkNode(item: PullRequest, label?: string): JSONContent {
  return {
    type: "prLink",
    attrs: {
      id: item.id,
      label: label ?? `#${item.number} ${item.title}`,
      state: item.state,
    } satisfies PrLinkAttrs,
  };
}

export default PrLink;
