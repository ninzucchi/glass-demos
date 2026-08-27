import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./ProjectBoardCanvas.css";
import { IconButton } from "@/components/ui/IconButton";

const CARD_W = 280;
const CARD_H = 124;
const CARD_GAP = 18;
const CLUSTER_PAD = 56;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export type ClusterItem = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export type CanvasCluster = {
  id: string;
  title: string;
  items: ClusterItem[];
};

type Rect = { x: number; y: number; w: number; h: number };

function hashUnit(id: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function hits(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y
  );
}

function blobRadius(count: number): number {
  if (count <= 1) return Math.max(CARD_W, CARD_H) / 2;
  return Math.sqrt(count) * 92 + 40;
}

function clusterOrigin(index: number, total: number, radius: number): { x: number; y: number } {
  if (total <= 1) return { x: 240, y: 180 };
  const angle = (index / total) * Math.PI * 2 - Math.PI * 0.65;
  const spread = radius * 2.15 + 140;
  return {
    x: 420 + Math.cos(angle) * spread,
    y: 300 + Math.sin(angle) * spread * 0.78,
  };
}

/** Spiral out from the cluster center until the card clears every placed rect. */
function placeInBlob(
  id: string,
  index: number,
  origin: { x: number; y: number },
  placed: Rect[],
): { x: number; y: number } {
  const spin = hashUnit(id, 3) * Math.PI * 2;
  const theta = index * GOLDEN + spin;
  let radius = Math.sqrt(index) * 64;
  if (index === 0) {
    const first = {
      x: origin.x - CARD_W / 2 + (hashUnit(id, 1) - 0.5) * 28,
      y: origin.y - CARD_H / 2 + (hashUnit(id, 2) - 0.5) * 20,
    };
    if (!placed.some((rect) => hits({ ...first, w: CARD_W, h: CARD_H }, rect, CARD_GAP))) {
      return first;
    }
  }
  while (radius < 2400) {
    const next = {
      x: origin.x + Math.cos(theta) * radius * 1.55 - CARD_W / 2,
      y: origin.y + Math.sin(theta) * radius * 0.82 - CARD_H / 2,
    };
    if (!placed.some((rect) => hits({ ...next, w: CARD_W, h: CARD_H }, rect, CARD_GAP))) {
      return next;
    }
    radius += 14;
  }
  return {
    x: origin.x + index * (CARD_W + CARD_GAP),
    y: origin.y,
  };
}

/** Place each former column as a loose blob. Nothing overlaps. Positions stay stable per id. */
export function nodesFromClusters(clusters: CanvasCluster[]): Node[] {
  const filled = clusters.filter((cluster) => cluster.items.length > 0);
  const maxRadius = Math.max(...filled.map((cluster) => blobRadius(cluster.items.length)), 80);
  const placed: Rect[] = [];
  const nodes: Node[] = [];
  filled.forEach((cluster, clusterIndex) => {
    const origin = clusterOrigin(clusterIndex, filled.length, maxRadius + CLUSTER_PAD);
    cluster.items.forEach((item, index) => {
      const position = placeInBlob(item.id, index, origin, placed);
      placed.push({ x: position.x, y: position.y, w: CARD_W, h: CARD_H });
      nodes.push({
        id: item.id,
        type: item.type,
        position,
        data: item.data,
        style: { width: CARD_W },
      });
    });
  });
  return nodes;
}

export function CardHandles() {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export function ProjectBoardCanvas({
  nodes: initialNodes,
  nodeTypes,
  onOpenNode,
}: {
  nodes: Node[];
  nodeTypes: NodeTypes;
  onOpenNode?: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner nodes={initialNodes} nodeTypes={nodeTypes} onOpenNode={onOpenNode} />
    </ReactFlowProvider>
  );
}

function CanvasInner({
  nodes: initialNodes,
  nodeTypes,
  onOpenNode,
}: {
  nodes: Node[];
  nodeTypes: NodeTypes;
  onOpenNode?: (id: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [spaceDown, setSpaceDown] = useState(false);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  useEffect(() => {
    setNodes(initialNodes);
    setEdges([]);
  }, [initialNodes, setEdges, setNodes]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return;
      }
      event.preventDefault();
      setSpaceDown(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", () => setSpaceDown(false));
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((current) => addEdge(connection, current)),
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      onOpenNode?.(node.id);
    },
    [onOpenNode],
  );

  return (
    <div
      className={
        spaceDown
          ? "project-board-canvas h-full min-h-0 cursor-grab"
          : "project-board-canvas h-full min-h-0"
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        panOnDrag={spaceDown}
        nodesDraggable={!spaceDown}
        selectionOnDrag={false}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        minZoom={0.35}
        maxZoom={1.75}
        deleteKeyCode={null}
        defaultEdgeOptions={{
          type: "bezier",
          style: { stroke: "var(--border-secondary)", strokeWidth: 1.5 },
        }}
        fitView
        fitViewOptions={{ padding: 0.16 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={32}
          size={3.2}
          color="color-mix(in oklab, var(--base) 34%, transparent)"
        />
        <Panel position="bottom-right" className="m-3">
          <div className="flex items-center gap-px rounded-full border border-secondary bg-elevated p-0.5">
            <IconButton
              name="minus"
              size="base"
              color="secondary"
              aria-label="Zoom out"
              onClick={() => void zoomOut()}
            />
            <IconButton
              name="plus"
              size="base"
              color="secondary"
              aria-label="Zoom in"
              onClick={() => void zoomIn()}
            />
            <IconButton
              name="arrows-expand"
              size="base"
              color="secondary"
              aria-label="Fit canvas"
              onClick={() => void fitView({ padding: 0.16 })}
            />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
