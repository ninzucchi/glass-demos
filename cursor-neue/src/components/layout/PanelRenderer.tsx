import { Fragment } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";
import type { LayoutNode } from "@/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Tile, type TileVariant } from "@/components/tile/Tile";
import { ResizeHandle } from "@/components/layout/ResizeHandle";

interface PanelRendererProps {
  node: LayoutNode;
  variant: TileVariant;
  // True for the subtree occupying the window's top-right corner; the corner
  // tile hosts the persistent panel toggle inline in its top toolbar.
  topRight?: boolean;
  // True for the subtree occupying the window's top-left corner; the corner tile
  // hosts the collapsed-sidebar re-expand cluster.
  topLeft?: boolean;
}

export function PanelRenderer({
  node,
  variant,
  topRight = false,
  topLeft = false,
}: PanelRendererProps) {
  const setSizes = useWorkspaceStore((s) => s.setSizes);

  if (node.kind === "tile") {
    return (
      <Tile
        tile={node}
        variant={variant}
        topRight={topRight}
        topLeft={topLeft}
      />
    );
  }

  const horizontal = node.direction === "horizontal";
  // Top-right corner: last child of a columns split, first child of a rows split.
  const cornerIndex = horizontal ? node.children.length - 1 : 0;
  // Top-left corner: always the first child (leftmost column / top row).
  const leftCornerIndex = 0;

  // Persist drag-resized split sizes for both panes; the store resolves which
  // container (chat tree or content scope) owns the split by node id.
  const handleLayout = (sizes: number[]) => {
    const same =
      sizes.length === node.sizes.length &&
      sizes.every((s, i) => Math.abs(s - node.sizes[i]) < 0.5);
    if (!same) setSizes(node.id, sizes);
  };

  return (
    <PanelGroup
      id={node.id}
      direction={horizontal ? "horizontal" : "vertical"}
      onLayout={handleLayout}
      className="min-h-0"
    >
      {node.children.map((child, i) => (
        <Fragment key={child.id}>
          {i > 0 && <ResizeHandle direction={horizontal ? "horizontal" : "vertical"} />}
          <Panel id={child.id} order={i} defaultSize={node.sizes[i]} minSize={12}>
            <PanelRenderer
              node={child}
              variant={variant}
              topRight={topRight && i === cornerIndex}
              topLeft={topLeft && i === leftCornerIndex}
            />
          </Panel>
        </Fragment>
      ))}
    </PanelGroup>
  );
}
