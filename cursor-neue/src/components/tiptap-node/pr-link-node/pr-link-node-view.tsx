import type { CSSProperties, MouseEvent } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Icon } from "@/components/ui/Icon";
import { useWindowId } from "@/components/window/WindowContext";
import { prStateColor, prStateIcon, type PrState } from "@/data/pullRequests";
import { isPrState } from "@/lib/prStateVisual";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import "./pr-link-node.scss";

function stateFromAttr(value: unknown): PrState {
  return isPrState(value) ? value : "open";
}

function PrStateLead({ state }: { state: PrState }) {
  switch (state) {
    case "draft":
    case "open":
    case "merged":
    case "closed":
      return (
        <span className="pr-link-node__icon">
          <Icon
            name={prStateIcon(state)}
            size="base"
            color="inherit"
            style={{ color: prStateColor(state) }}
          />
        </span>
      );
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/** Inline PR mention. Click opens that PR's tab, same as a Kanban PR card. */
export function PrLinkNodeView({ node }: NodeViewProps) {
  const windowId = useWindowId();
  const openPrTab = useWorkspaceStore((s) => s.openPrTab);
  const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
  const label = typeof node.attrs.label === "string" ? node.attrs.label : "";
  const state = stateFromAttr(node.attrs.state);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (id) openPrTab(windowId, id);
  };

  const done = state === "merged" || state === "closed";

  return (
    <NodeViewWrapper as="span" className="pr-link-node" contentEditable={false}>
      <a
        href={`#pr/${id}`}
        className={`pr-link-node__link${done ? " pr-link-node__link--done" : ""}`}
        style={{ "--pr-status": prStateColor(state) } as CSSProperties}
        onClick={onClick}
      >
        <PrStateLead state={state} />
        <span className="pr-link-node__label">{label}</span>
      </a>
    </NodeViewWrapper>
  );
}
