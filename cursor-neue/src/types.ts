// Core domain types for the prototype.

// "chat" is a tab type too (same Tile/Tab engine) but it is only used by the
// Chat panel and is NOT offered in the Content panel's + menu.
export type TabType = "chat" | "files" | "browser" | "terminal" | "canvas" | "review";

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  /** Files tabs only: parent folder shown in the breadcrumb (e.g. "Views"). */
  folder?: string;
  /** Chat tabs only: the agent whose conversation this tab shows. Titles/icons
   *  derive from the agent at render time, so renames stay live. */
  agentId?: string;
}

// The two tile-hosting panes. Both share the same layout tree + tile engine;
// this is purely the placement-policy / UI-variant axis.
export type PaneKind = "chat" | "content";

/** THE placement policy: which tabs may live in which pane. Today chat tabs
 *  stay in the chat pane and everything else stays in the content pane; future
 *  interoperability between the panes is a change to this one predicate. */
export const canDropInPane = (type: TabType, pane: PaneKind): boolean =>
  (type === "chat") === (pane === "chat");

export interface TileNode {
  kind: "tile";
  id: string;
  tabs: Tab[];
  activeTabId: string;
  /** Sidebar open/closed shared by tab type within this tile (tab bar). Tabs of
   *  the same type share one value; absent entries fall back to the type default.
   *  Toggles also sync this value across the tile's side-by-side group (tiles
   *  connected through horizontal splits only — see `horizontalGroup`). */
  sidebarOpenByType?: Partial<Record<TabType, boolean>>;
}

// "horizontal" = side-by-side columns (vertical divider, PanelGroup horizontal)
// "vertical"   = stacked rows (horizontal divider, PanelGroup vertical)
export type SplitDirection = "horizontal" | "vertical";

export interface SplitNode {
  kind: "split";
  id: string;
  direction: SplitDirection;
  children: LayoutNode[];
  sizes: number[]; // percentages, length === children.length
}

export type LayoutNode = TileNode | SplitNode;

// User-facing split actions; mapped to a direction.
export type SplitSide = "right" | "down";
export const sideToDirection = (side: SplitSide): SplitDirection =>
  side === "right" ? "horizontal" : "vertical";

// Where a dragged tab lands on a target tile: "tab" merges it into the tile's
// tab bar; "right"/"down" split the tile and place it in the new pane.
export type DropZone = SplitSide | "tab";

// Sidebar entities. Content is shared per "scope" (today: workspace, else the agent itself).
export type AgentStatus = "idle" | "running" | "attention";

// A single chat turn. `tool` is an agent-only status line (e.g. "Worked 12s")
// rendered just above the message text.
export interface ChatMessage {
  role: "user" | "agent";
  text: string;
  tool?: string;
}

/** Marks an agent as a side-thread spawned from a text selection in another
 *  chat. Thread agents reuse the whole chat tab/tile machinery but are hidden
 *  from the sidebar (they're never added to `agentOrder`). */
export interface ThreadRef {
  parentAgentId: string;
  /** Index into the parent agent's `messages` the selection came from. */
  messageIndex: number;
  /** The highlighted text, quoted in the thread header. */
  excerpt: string;
}

export interface Agent {
  id: string;
  workspaceId: string | null;
  /** Git branch this chat is on. Scopes the Content panel within a workspace:
   *  same workspace + same branch share a panel; different branches don't.
   *  Ignored for standalone (workspace-less) agents. */
  branch: string;
  title: string;
  status: AgentStatus;
  /** Epoch ms of last activity. Drives the single-workspace sidebar's recency
   *  grouping (see `groupAgentsByRecency`). */
  updatedAt: number;
  /** Simulated conversation shown in the chat panel (shared across windows). */
  messages: ChatMessage[];
  /** Present only on thread agents (see ThreadRef). */
  thread?: ThreadRef;
}

export interface Workspace {
  id: string;
  name: string;
}

// Single seam for "what Content does this agent see?". A future Group concept
// (heterogeneous, cross-workspace) would just take precedence in this resolver.
export type ContentScopeId = string; // "ws:<id>@<branch>" | "agent:<id>" (later: "group:<id>")
export const contentScopeId = (a: Agent): ContentScopeId =>
  a.workspaceId ? `ws:${a.workspaceId}@${a.branch}` : `agent:${a.id}`;

/** Workspace id embedded in a scope id, or null for a standalone-agent scope.
 *  Canonical decoder so the "@<branch>" suffix is split in exactly one place. */
export const workspaceIdOfScope = (scopeId: ContentScopeId): string | null =>
  scopeId.startsWith("ws:") ? scopeId.slice(3).split("@")[0] : null;

/** Branch embedded in a workspace scope id, or null for a standalone-agent
 *  scope. Mirror of `workspaceIdOfScope` for the "@<branch>" half. */
export const branchOfScope = (scopeId: ContentScopeId): string | null =>
  scopeId.startsWith("ws:") ? scopeId.slice(3).split("@").slice(1).join("@") : null;

export interface ContentScopeState {
  layout: LayoutNode;
  open: boolean;
  /** True after the last content tab was closed. Hides the island; opening the
   *  content panel reseeds the workspace's main default tabs. */
  cleared?: boolean;
}

// Which workspace a window's sidebar is filtered to; `null` = all workspaces. The
// helpers below are React-free so every switcher variant and the sidebar filter
// resolve identically.
export type WorkspaceScope = string | null;

export interface WorkspaceOption {
  id: WorkspaceScope;
  label: string;
}

// Canonical option list: "All Workspaces" first, then workspaces in order.
export const workspaceOptions = (
  workspaces: Record<string, Workspace>,
  order: string[],
): WorkspaceOption[] => [
  { id: null, label: "All Workspaces" },
  ...order.map((id) => ({ id, label: workspaces[id]?.name ?? id })),
];

// An unknown/stale scope gracefully falls back to all, never an empty sidebar.
export const visibleWorkspaceIds = (scope: WorkspaceScope, order: string[]): string[] =>
  scope && order.includes(scope) ? [scope] : order;

// Recency buckets for the single-workspace sidebar view. Order here is the
// render order; labels are user-facing.
export type RecencyBucketId = "today" | "yesterday" | "last7" | "older";
export interface RecencyBucket {
  id: RecencyBucketId;
  label: string;
  agents: Agent[];
}

const RECENCY_LABELS: Record<RecencyBucketId, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  older: "Older",
};

const DAY_MS = 86_400_000;

// Which bucket a timestamp falls into, measured against local-midnight
// boundaries. Missing/invalid timestamps sort into "older" so a bad value never
// produces a NaN comparison or jumps to the top.
const recencyBucketOf = (updatedAt: number, startOfToday: number): RecencyBucketId => {
  if (!Number.isFinite(updatedAt)) return "older";
  if (updatedAt >= startOfToday) return "today";
  if (updatedAt >= startOfToday - DAY_MS) return "yesterday";
  if (updatedAt >= startOfToday - 7 * DAY_MS) return "last7";
  return "older";
};

/** Group agents into recency buckets (Today / Yesterday / Last 7 Days / Older),
 *  newest first within each bucket. Empty buckets are omitted so callers can map
 *  straight to section headers. React-free so the sidebar and any future surface
 *  bucket identically. */
export const groupAgentsByRecency = (agents: Agent[], now: number = Date.now()): RecencyBucket[] => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startOfToday = start.getTime();

  const byBucket: Record<RecencyBucketId, Agent[]> = { today: [], yesterday: [], last7: [], older: [] };
  for (const agent of agents) byBucket[recencyBucketOf(agent.updatedAt, startOfToday)].push(agent);

  const order: RecencyBucketId[] = ["today", "yesterday", "last7", "older"];
  return order
    .filter((id) => byBucket[id].length > 0)
    .map((id) => ({
      id,
      label: RECENCY_LABELS[id],
      agents: byBucket[id].sort((a, b) => b.updatedAt - a.updatedAt),
    }));
};

export const workspaceScopeLabel = (
  scope: WorkspaceScope,
  workspaces: Record<string, Workspace>,
): string => (scope ? workspaces[scope]?.name ?? "All Workspaces" : "All Workspaces");

// Shared tab metadata (kept here, free of React, so both the pure layout
// transforms and the component registry can reference it).
export const TAB_LABEL: Record<TabType, string> = {
  chat: "Chat",
  files: "Files",
  browser: "Browser",
  terminal: "Terminal",
  canvas: "Canvas",
  review: "Review",
};

// A Files tab shows a specific open file once `folder` is set (opening a file
// always writes the parent path, including "" for project-root files). Title
// alone is not enough — renaming the default label would otherwise leave stale
// home tabs looking like open files (wrong icon + "src > …" breadcrumb).
export const filesTabHasOpenFile = (tab: Tab): boolean =>
  tab.type === "files" && tab.folder !== undefined;

// New tabs open with their sidebar collapsed by default, except files.
export const DEFAULT_SIDEBAR_OPEN: Record<TabType, boolean> = {
  chat: false,
  files: true,
  browser: false,
  terminal: false,
  canvas: false,
  review: false,
};

// Resolve a tile's sidebar state for a tab type: the shared per-type value if
// set, else the type default. Single source of truth for reads and toggles.
export const tileSidebarOpen = (tile: TileNode, type: TabType): boolean =>
  tile.sidebarOpenByType?.[type] ?? DEFAULT_SIDEBAR_OPEN[type];

/** One item drawn inside a canvas block, in block-local coordinates. Shapes and
 *  text boxes are positioned boxes, strokes are freehand point lists, and edges
 *  are connectors that reference the two boxes they span. */
export type CanvasItem =
  | { id: string; kind: "rect" | "circle"; x: number; y: number; w: number; h: number }
  | { id: string; kind: "text"; x: number; y: number; w: number; h: number; text: string }
  | { id: string; kind: "stroke"; points: { x: number; y: number }[] }
  | { id: string; kind: "edge"; from: CanvasAnchor; to: CanvasAnchor };

/** An edge end, pinned to one of a box's four attachment nodes (0 = top, then
 *  clockwise). Pinning to the node rather than the box keeps a connector on the
 *  side the user drew it from as the boxes move. */
export interface CanvasAnchor {
  id: string;
  node: number;
}

/** A box item — the kinds an edge can connect and the user can drag. */
export type CanvasBox = Extract<CanvasItem, { x: number }>;

export const isCanvasBox = (item: CanvasItem): item is CanvasBox => "x" in item;

/** A block in the composer's expanded document: markdown/plain text, or an
 *  embedded drawing canvas. */
export type ComposerBlock =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "canvas"; items: CanvasItem[] };

// Tab types offered in the Content panel's + menu (everything except chat).
export const CONTENT_TAB_TYPES: TabType[] = [
  "files",
  "browser",
  "terminal",
  "canvas",
  "review",
];

// Tab types pinned to every workspace until the user edits its set (pin/unpin
// writes a per-workspace override into `pinnedTabs`).
export const DEFAULT_PINNED_TABS: TabType[] = ["review", "files", "terminal"];

// Canonical display order for pinned sets: the defaults keep their slots, later
// pins slot in after them. Toggling rebuilds against this list so the island's
// order never depends on the sequence of pin/unpin clicks.
export const PINNED_TAB_ORDER: TabType[] = [
  ...DEFAULT_PINNED_TABS,
  ...CONTENT_TAB_TYPES.filter((t) => !DEFAULT_PINNED_TABS.includes(t)),
];

/** A workspace's pinned tab types: its stored override if present, else the
 *  default set. Single resolver so every surface (island, context menus)
 *  answers "is this pinned?" identically. */
export const pinnedTabsFor = (
  pinned: Record<string, TabType[]>,
  workspaceId: string,
): TabType[] => pinned[workspaceId] ?? DEFAULT_PINNED_TABS;
