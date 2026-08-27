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
const CARD_H = 118;
const CARD_GAP = 16;
const CLUSTER_GAP = 72;
const ANGLE_STEP = Math.PI / 10;
export const HUB_W = 280;
export const HUB_H = 48;

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

function bbox(rects: Rect[]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Closest open slot around the current pile. Favors height so wide cards form a blob. */
function placeInBlob(id: string, placed: Rect[]): { x: number; y: number } {
  if (placed.length === 0) {
    return {
      x: (hashUnit(id, 1) - 0.5) * 36,
      y: (hashUnit(id, 2) - 0.5) * 24,
    };
  }
  const pile = bbox(placed);
  const origin = { x: pile.x + pile.w / 2, y: pile.y + pile.h / 2 };
  const spin = hashUnit(id, 4) * Math.PI * 2;
  for (let radius = 36; radius < 1600; radius += 10) {
    const turns = Math.max(12, Math.round((Math.PI * 2) / ANGLE_STEP));
    for (let step = 0; step < turns; step++) {
      const theta = spin + step * ANGLE_STEP;
      const next = {
        x: origin.x + Math.cos(theta) * radius * 0.62 - CARD_W / 2,
        y: origin.y + Math.sin(theta) * radius * 1.18 - CARD_H / 2,
      };
      if (!placed.some((rect) => hits({ ...next, w: CARD_W, h: CARD_H }, rect, CARD_GAP))) {
        return next;
      }
    }
  }
  return { x: pile.x, y: pile.y + pile.h + CARD_GAP };
}

function packCluster(items: ClusterItem[]): { item: ClusterItem; local: { x: number; y: number } }[] {
  const placed: Rect[] = [];
  return items.map((item) => {
    const local = placeInBlob(item.id, placed);
    placed.push({ x: local.x, y: local.y, w: CARD_W, h: CARD_H });
    return { item, local };
  });
}

function clusterSlot(index: number, total: number, sizes: Rect[]): { x: number; y: number } {
  const cols = total <= 2 ? total : 2;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const colWidth: number[] = [];
  const rowHeight: number[] = [];
  sizes.forEach((size, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    colWidth[c] = Math.max(colWidth[c] ?? 0, size.w);
    rowHeight[r] = Math.max(rowHeight[r] ?? 0, size.h);
  });
  let x = 48;
  for (let c = 0; c < col; c++) x += colWidth[c] + CLUSTER_GAP;
  let y = 48;
  for (let r = 0; r < row; r++) y += rowHeight[r] + CLUSTER_GAP;
  return { x, y };
}

/** Pack each former column as its own blob, then sit those piles in a compact grid. */
export function nodesFromClusters(clusters: CanvasCluster[]): Node[] {
  const filled = clusters.filter((cluster) => cluster.items.length > 0);
  const packed = filled.map((cluster) => {
    const members = packCluster(cluster.items);
    const bounds = bbox(
      members.map((member) => ({ x: member.local.x, y: member.local.y, w: CARD_W, h: CARD_H })),
    );
    return { members, bounds };
  });
  const nodes: Node[] = [];
  packed.forEach((cluster, index) => {
    const slot = clusterSlot(
      index,
      packed.length,
      packed.map((item) => item.bounds),
    );
    const ox = slot.x - cluster.bounds.x;
    const oy = slot.y - cluster.bounds.y;
    for (const member of cluster.members) {
      nodes.push({
        id: member.item.id,
        type: member.item.type,
        position: { x: member.local.x + ox, y: member.local.y + oy },
        data: member.item.data,
        style: { width: CARD_W },
      });
    }
  });
  return nodes;
}

function nodeRect(node: Node): Rect {
  const width =
    typeof node.style?.width === "number" ? node.style.width : node.type === "projectHub" ? HUB_W : CARD_W;
  const height = node.type === "projectHub" ? HUB_H : CARD_H;
  return { x: node.position.x, y: node.position.y, w: width, h: height };
}

function nodeCenter(node: Node): { x: number; y: number } {
  const rect = nodeRect(node);
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** Sit the project hub in the middle and push overlapping cards out. */
export function placeHubNode(nodes: Node[], hub: Node): Node[] {
  if (nodes.length === 0) {
    return [{ ...hub, position: { x: 48, y: 48 }, style: { width: HUB_W }, zIndex: 2 }];
  }
  const box = bbox(nodes.map(nodeRect));
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const hubNode: Node = {
    ...hub,
    position: { x: cx - HUB_W / 2, y: cy - HUB_H / 2 },
    style: { width: HUB_W },
    zIndex: 2,
  };
  const hubRect = nodeRect(hubNode);
  const shifted = nodes.map((node) => {
    const rect = nodeRect(node);
    if (!hits(rect, hubRect, CARD_GAP)) return node;
    const center = nodeCenter(node);
    let dx = center.x - cx;
    let dy = center.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    dx /= dist;
    dy /= dist;
    const minDist = Math.max(HUB_W, HUB_H) / 2 + Math.max(rect.w, rect.h) / 2 + CARD_GAP;
    const push = Math.max(0, minDist - dist);
    return {
      ...node,
      position: { x: node.position.x + dx * push, y: node.position.y + dy * push },
    };
  });
  return [hubNode, ...shifted];
}

export function canvasEdges(pairs: { source: string; target: string }[]): Edge[] {
  return pairs.map(({ source, target }) => ({
    id: `${source}->${target}`,
    source,
    target,
  }));
}

/** Pick handles so wires leave the nearer side of each card. */
export function routeEdges(edges: Edge[], nodes: Node[]): Edge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return edges.map((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return edge;
    const from = nodeCenter(source);
    const to = nodeCenter(target);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return {
        ...edge,
        sourceHandle: dx >= 0 ? "sr" : "sl",
        targetHandle: dx >= 0 ? "tl" : "tr",
      };
    }
    return {
      ...edge,
      sourceHandle: dy >= 0 ? "sb" : "st",
      targetHandle: dy >= 0 ? "tt" : "tb",
    };
  });
}

export function CardHandles() {
  return (
    <>
      <Handle type="target" id="tt" position={Position.Top} />
      <Handle type="source" id="st" position={Position.Top} />
      <Handle type="target" id="tb" position={Position.Bottom} />
      <Handle type="source" id="sb" position={Position.Bottom} />
      <Handle type="target" id="tl" position={Position.Left} />
      <Handle type="source" id="sl" position={Position.Left} />
      <Handle type="target" id="tr" position={Position.Right} />
      <Handle type="source" id="sr" position={Position.Right} />
    </>
  );
}

export function ProjectBoardCanvas({
  nodes: initialNodes,
  edges: initialEdges = [],
  nodeTypes,
  onOpenNode,
}: {
  nodes: Node[];
  edges?: Edge[];
  nodeTypes: NodeTypes;
  onOpenNode?: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        onOpenNode={onOpenNode}
      />
    </ReactFlowProvider>
  );
}

function CanvasInner({
  nodes: initialNodes,
  edges: initialEdges,
  nodeTypes,
  onOpenNode,
}: {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  onOpenNode?: (id: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [spaceDown, setSpaceDown] = useState(false);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialEdges, initialNodes, setEdges, setNodes]);

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
          ? "project-board-canvas relative h-full min-h-0 cursor-grab"
          : "project-board-canvas relative h-full min-h-0"
      }
    >
      <div className="project-board-canvas__wash" />
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
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.8}
          color="color-mix(in oklab, var(--base) 9.6%, transparent)"
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
              onClick={() => void fitView({ padding: 0.2 })}
            />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
