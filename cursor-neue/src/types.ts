import type { IconName } from "@/icons/iconNames";

// Core domain types for the prototype.

// "chat" is a tab type too (same Tile/Tab engine) but it is only used by the
// Chat panel and is NOT offered in the Content panel's + menu.
export type TabType = "chat" | "files" | "browser" | "terminal" | "canvas" | "review" | "project";

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  /** Files tabs only: parent folder shown in the breadcrumb (e.g. "Views"). */
  folder?: string;
  /** Chat tabs only: the agent whose conversation this tab shows. Titles/icons
   *  derive from the agent at render time, so renames stay live. */
  agentId?: string;
  /** Chat tabs only: one replaceable slot beside a project. Italic until the
   *  user double-clicks to keep it. */
  ephemeral?: boolean;
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
   *  the same type share one value; absent entries fall back to the type default. */
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
// Live sidebar-dot + project-board column. `idle` is Done / read.
// `unread` is new activity that is not blocking. `attention` needs a reply.
// `running` is Working. Opening the chat writes idle.
export type AgentStatus = "idle" | "running" | "attention" | "unread";

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  attention: "Needs Attention",
  unread: "Unread",
  running: "Working",
  idle: "Done",
};

/** Project board column order (left to right). */
export const AGENT_BOARD_STATUSES: AgentStatus[] = [
  "attention",
  "unread",
  "running",
  "idle",
];

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

/** A project is an agent that can also nest other agents. Same chat, content
 *  scope, and metadata as a regular agent; the sidebar lists it under Projects. */
export type AgentKind = "agent" | "project";

/** Cursor color-family tokens used as a project icon stroke. */
export const PROJECT_COLORS = [
  "default",
  "green",
  "cyan",
  "blue",
  "purple",
  "magenta",
  "orange",
  "yellow",
  "red",
  "brand",
] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

export const PROJECT_COLOR_LABEL: Record<ProjectColor, string> = {
  default: "Default",
  green: "Green",
  cyan: "Cyan",
  blue: "Blue",
  purple: "Purple",
  magenta: "Magenta",
  orange: "Orange",
  yellow: "Yellow",
  red: "Red",
  brand: "Brand",
};

export const PROJECT_COLOR_STROKE: Record<ProjectColor, string> = {
  default: "var(--icon-secondary)",
  green: "var(--green)",
  cyan: "var(--cyan)",
  blue: "var(--blue)",
  purple: "var(--purple)",
  magenta: "var(--magenta)",
  orange: "var(--orange)",
  yellow: "var(--yellow)",
  red: "var(--red)",
  brand: "var(--brand)",
};

export const PROJECT_COLOR_SWATCH: Record<ProjectColor, string> = {
  default: "var(--bg-quaternary)",
  green: "var(--green)",
  cyan: "var(--cyan)",
  blue: "var(--blue)",
  purple: "var(--purple)",
  magenta: "var(--magenta)",
  orange: "var(--orange)",
  yellow: "var(--yellow)",
  red: "var(--red)",
  brand: "var(--brand)",
};

/** Selected and hover wash for a project row. */
export const PROJECT_COLOR_BG: Record<ProjectColor, string> = {
  default: "bg-quaternary",
  green: "bg-green-quaternary",
  cyan: "bg-cyan-quaternary",
  blue: "bg-blue-quaternary",
  purple: "bg-purple-quaternary",
  magenta: "bg-magenta-quaternary",
  orange: "bg-orange-quaternary",
  yellow: "bg-yellow-quaternary",
  red: "bg-red-quaternary",
  brand: "bg-[color-mix(in_oklab,var(--brand)_8%,transparent)]",
};

export const PROJECT_COLOR_HOVER_BG: Record<ProjectColor, string> = {
  default: "hover:bg-quaternary",
  green: "hover:bg-green-quaternary",
  cyan: "hover:bg-cyan-quaternary",
  blue: "hover:bg-blue-quaternary",
  purple: "hover:bg-purple-quaternary",
  magenta: "hover:bg-magenta-quaternary",
  orange: "hover:bg-orange-quaternary",
  yellow: "hover:bg-yellow-quaternary",
  red: "hover:bg-red-quaternary",
  brand: "hover:bg-[color-mix(in_oklab,var(--brand)_8%,transparent)]",
};

/** Icon well: one step above the row hover wash so the shape still reads. */
export const PROJECT_COLOR_WELL: Record<ProjectColor, string> = {
  default: "bg-tertiary",
  green: "bg-green-tertiary",
  cyan: "bg-cyan-tertiary",
  blue: "bg-blue-tertiary",
  purple: "bg-purple-tertiary",
  magenta: "bg-magenta-tertiary",
  orange: "bg-orange-tertiary",
  yellow: "bg-yellow-tertiary",
  red: "bg-red-tertiary",
  brand: "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)]",
};

/** Non-empty workspace membership. Every agent has at least one id. */
export type WorkspaceIds = readonly [string, ...string[]];

export interface Agent {
  id: string;
  /** Absent = `"agent"`. `"project"` is a first-class chat that can own children. */
  kind?: AgentKind;
  /** Workspaces this agent belongs to. Never empty — `normalizeWorkspaceIds`
   *  is the only writer. A project's stored list is its own chat scope;
   *  sidebar membership is `projectWorkspaceIds` (union of children). */
  workspaceIds: WorkspaceIds;
  /** Parent project. Set only on regular agents; those rows leave Chats and
   *  nest under the project in the Projects section. */
  projectId?: string | null;
  /** Git branch this chat is on. Scopes the Content panel within a workspace:
   *  same workspace + same branch share a panel; different branches don't.
   *  Ignored for standalone (workspace-less) agents. */
  branch: string;
  title: string;
  /** Live sidebar status. Opening the chat writes `idle`. */
  status: AgentStatus;
  /** Epoch ms of the last chat message. Drives the sidebar's Updated grouping. */
  updatedAt: number;
  /** Simulated conversation shown in the chat panel (shared across windows). */
  messages: ChatMessage[];
  /** Present only on thread agents (see ThreadRef). */
  thread?: ThreadRef;
  /** Unsent New Agent. Stays in the sidebar until the first message; leaving
   *  the chat without sending discards it. */
  draft?: boolean;
  /** Project-only: sidebar glyph. Stroke uses `color`; hover still shows the chevron. */
  icon?: IconName;
  /** Project-only: Cursor color-family token for the icon stroke. */
  color?: ProjectColor;
  /** Project-only: one-line summary under the title in the project thread header. */
  description?: string;
}

/** Sidebar New Agent / Cmd+N land here when no folder or project is specified. */
export const DEFAULT_WORKSPACE_ID = "everysphere";

/** Collapse any id list to a unique, non-empty membership. Null/empty → default. */
export function normalizeWorkspaceIds(
  ids?: readonly (string | null | undefined)[] | string | null,
): WorkspaceIds {
  const list = Array.isArray(ids) ? ids : [ids];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of list) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (out.length === 0) out.push(DEFAULT_WORKSPACE_ID);
  return out as unknown as WorkspaceIds;
}

/** First (primary) workspace. Always defined. */
export const primaryWorkspaceId = (a: Agent): string => a.workspaceIds[0];

export const agentInWorkspace = (a: Agent, workspaceId: string): boolean =>
  a.workspaceIds.includes(workspaceId);

export const agentKind = (a: Agent): AgentKind => a.kind ?? "agent";
export const isProject = (a: Agent | undefined): boolean => !!a && agentKind(a) === "project";

/** Regular sidebar chat: not a project, not a thread, not inside a project. */
export const isChatsAgent = (a: Agent): boolean =>
  !a.thread && !isProject(a) && !a.projectId;

/** New Agent that has not sent a message. Distinct from composer `drafts`
 *  (unsent text on any chat). */
export const isDraftAgent = (a: Agent | undefined): boolean =>
  !!a && !!a.draft && !a.thread && !isProject(a);

/** First line of the latest agent reply, or empty when none exists. */
export const lastAgentReply = (agent: Agent): string => {
  for (let i = agent.messages.length - 1; i >= 0; i--) {
    const message = agent.messages[i];
    if (message.role !== "agent") continue;
    return message.text.split("\n")[0]?.trim() ?? "";
  }
  return "";
};

/** Agents nested under a project, in `agentOrder`. */
export const agentsInProject = (
  agents: Record<string, Agent>,
  agentOrder: string[],
  projectId: string,
): Agent[] =>
  agentOrder
    .map((id) => agents[id])
    .filter((a): a is Agent => !!a && a.projectId === projectId && !a.thread && !isProject(a));

/** Union of child agents' workspaces, in first-seen order. When the project
 *  has no children, the project's own membership is the hover-card list. */
export function projectWorkspaceIds(
  projectId: string,
  agents: Record<string, Agent>,
  agentOrder: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const child of agentsInProject(agents, agentOrder, projectId)) {
    for (const id of child.workspaceIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  if (out.length === 0) {
    const project = agents[projectId];
    if (project) {
      for (const id of project.workspaceIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

/** True when `id` is in the sidebar Pinned list. Pin is membership in
 *  `WorkspaceData.pinnedAgents`, not a field on the agent — the chat still
 *  belongs to its workspace. */
export const isAgentPinned = (pinnedAgents: string[], id: string): boolean =>
  pinnedAgents.includes(id);

/** Live pinned rows in pin order. Drops stale ids, threads, and children of a
 *  pinned project (those stay nested under the project folder). */
export const pinnedAgentsFor = (
  agents: Record<string, Agent>,
  pinnedAgents: string[],
): Agent[] =>
  pinnedAgents
    .map((id) => agents[id])
    .filter((a): a is Agent => {
      if (!a || a.thread) return false;
      if (!isProject(a) && a.projectId && pinnedAgents.includes(a.projectId)) return false;
      return true;
    });

/** How the sidebar lists agents. Workspace keeps folder groups; Updated
 *  splits chats into Today / Yesterday / Last 7 Days / Older. */
export type AgentGroupBy = "workspace" | "updated";

/** Keys in `WindowState.collapsedSidebar` for section headers. Workspace and
 *  project folders use their own ids. */
export const SIDEBAR_SECTION = {
  chats: "sec:chats",
  pinned: "sec:pinned",
  projects: "sec:projects",
  group: "sec:group",
} as const;

export interface Workspace {
  id: string;
  name: string;
  /** Initial sidebar folder state. A window may override this in
   *  `collapsedSidebar`; absent override = this default. */
  collapsed?: boolean;
}

/** Window override, else `fallback` (workspace.collapsed, or false). */
export const sidebarCollapsed = (
  id: string,
  overrides?: Record<string, boolean>,
  fallback = false,
): boolean => overrides?.[id] ?? fallback;

/** Resolved workspace folder collapse: window override, else the workspace default. */
export const workspaceFolderCollapsed = (
  workspace: Workspace,
  overrides?: Record<string, boolean>,
): boolean => sidebarCollapsed(workspace.id, overrides, workspace.collapsed ?? false);

// Single seam for "what Content does this agent see?". A project and every
// child (and thread) under it share one scope, so the right pane's open state,
// size (while it stays open), layout, and selected tab persist across hops.
// A future Group concept would just take precedence in this resolver.
export type ContentScopeId = string; // "ws:<id>@<branch>" | "project:<id>" | "agent:<id>"

/** Project that owns this agent's content panel, if any. */
export const contentProjectId = (a: Agent): string | null =>
  isProject(a) ? a.id : (a.projectId ?? null);

export const contentScopeId = (a: Agent): ContentScopeId => {
  const projectId = contentProjectId(a);
  return projectId
    ? `project:${projectId}`
    : `ws:${primaryWorkspaceId(a)}@${a.branch}`;
};

/** Project chats own a private content scope so they do not share workspace tabs. */
export const isProjectScope = (scopeId: ContentScopeId): boolean =>
  scopeId.startsWith("project:");

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
  /** Whether the content pane is showing. Fresh scopes start closed; opening
   *  is an explicit action (toggle, pinned-island click, drop, etc.). */
  open: boolean;
  /** True after the last content tab was closed. Hides the island; opening the
   *  content panel reseeds the workspace's main default tabs. */
  cleared?: boolean;
}

// Shared tab metadata (kept here, free of React, so both the pure layout
// transforms and the component registry can reference it).
export const TAB_LABEL: Record<TabType, string> = {
  chat: "Chat",
  files: "Files",
  browser: "Browser",
  terminal: "Terminal",
  canvas: "Canvas",
  review: "Review",
  project: "Project",
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
  project: false,
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
