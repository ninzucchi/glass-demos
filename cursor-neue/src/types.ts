import type { IconName } from "@/icons/iconNames";

// Core domain types for the prototype.

// "chat" is a tab type too (same Tile/Tab engine) but it is only used by the
// Chat panel and is NOT offered in the Content panel's + menu.
export type TabType =
  | "chat"
  | "files"
  | "browser"
  | "terminal"
  | "canvas"
  | "review"
  | "project"
  | "pr"
  | "context";

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  /** Files and Context tabs: parent folder shown in the breadcrumb (e.g. "Views"). */
  folder?: string;
  /** Chat tabs only: the agent whose conversation this tab shows. Titles/icons
   *  derive from the agent at render time, so renames stay live. */
  agentId?: string;
  /** PR tabs only: the pull request this tab shows. Titles/icons derive from
   *  the PR at render time. */
  prId?: string;
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
// `running` is Working. Opening the chat writes unread / attention to idle.
export type AgentStatus = "idle" | "running" | "attention" | "unread";

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  attention: "Blocked",
  unread: "Unread",
  running: "Working",
  idle: "Done",
};

/** Project board column order (left to right). Done is last.
 *  Unread is not a column; those agents count as Done. */
export const AGENT_BOARD_STATUSES: AgentStatus[] = [
  "attention",
  "running",
  "idle",
];

/** Project boards do not show Unread. Those agents sit in Done. */
export function projectBoardAgentStatus(status: AgentStatus): AgentStatus {
  return status === "unread" ? "idle" : status;
}

/** Composer Agents tray: Needs Attention, Working, Unread, Done. */
export const AGENT_TRAY_STATUSES: AgentStatus[] = [
  "attention",
  "running",
  "unread",
  "idle",
];

// A single chat turn. `tool` is an agent-only status line (e.g. "Worked 12s")
// rendered just above the message text.
export interface ChatMessage {
  role: "user" | "agent" | "divider";
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
 *  scope, and metadata as a regular agent; the sidebar lists it under Projects.
 *  A workspace agent is the folder's own chat + aggregated tracker. Hidden
 *  from sidebar lists; the Workspace row selects it. */
export type AgentKind = "agent" | "project" | "workspace";

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
   *  is the only writer. A project's stored list is its own chat scope.
   *  Merged repo folders place the project with `resolveProjectFolder`. */
  workspaceIds: WorkspaceIds;
  /** Parent project. Set only on regular agents; those rows leave Chats and
   *  nest under the project in the Projects section. */
  projectId?: string | null;
  /** Parent group in Projects grouping. `undefined` infers from `projectId` or
   *  the primary workspace. `null` is the top level. A string is a group id. */
  groupParentId?: string | null;
  /** Git branch this chat is on. Scopes the Content panel within a workspace:
   *  same workspace + same branch share a panel; different branches don't.
   *  Ignored for standalone (workspace-less) agents. */
  branch: string;
  title: string;
  /** Live sidebar status. Opening the chat writes unread / attention to `idle`. */
  status: AgentStatus;
  /** Epoch ms of the last turn. Folder lists and Recents sort by this. */
  updatedAt: number;
  /** Epoch ms the project was created. Transcript divider uses this. */
  createdAt?: number;
  /** Simulated conversation shown in the chat panel (shared across windows). */
  messages: ChatMessage[];
  /** Present only on thread agents (see ThreadRef). */
  thread?: ThreadRef;
  /** Unsent New Agent. Stays in the sidebar until the first message; leaving
   *  the chat without sending discards it. */
  draft?: boolean;
  /** Folders mode: listed under the parent. Set by a structure edit (group,
   *  drag, move-to), a user message, or a pinned chat tab. False = hidden
   *  from the sidebar without leaving the project. */
  elevated?: boolean;
  /** Project-only: sidebar glyph. Stroke uses `color`; hover still shows the chevron. */
  icon?: IconName;
  /** Project-only: Cursor color-family token for the icon stroke. */
  color?: ProjectColor;
  /** Project-only: summary under the title in the thread header and tracker doc. */
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
export const isWorkspace = (a: Agent | undefined): boolean =>
  !!a && agentKind(a) === "workspace";
/** Project or workspace: owns a Tracker tab and a thread header. */
export const isTrackerOwner = (a: Agent | undefined): boolean =>
  isProject(a) || isWorkspace(a);

/** Regular sidebar chat: not a project, workspace, thread, or project child. */
export const isChatsAgent = (a: Agent): boolean =>
  !a.thread && !isProject(a) && !isWorkspace(a) && !a.projectId;

/** Row that belongs in the main Chats list. Projects join when `includeProjects`. */
export const isMainListItem = (a: Agent, includeProjects: boolean): boolean => {
  if (a.thread || a.projectId || isWorkspace(a)) return false;
  if (isChatsAgent(a)) return true;
  return includeProjects && isProject(a) && !a.draft;
};

/** New Agent that has not sent a message. Distinct from composer `drafts`
 *  (unsent text on any chat). */
export const isDraftAgent = (a: Agent | undefined): boolean =>
  !!a && !!a.draft && !a.thread && !isProject(a);

/** New Project that has not sent a first prompt. Hidden from the Projects list
 *  until send publishes it. */
export const isDraftProject = (a: Agent | undefined): boolean =>
  !!a && !!a.draft && isProject(a);

/** Unsent New Agent or New Project. */
export const isBlankDraft = (a: Agent | undefined): boolean =>
  isDraftAgent(a) || isDraftProject(a);

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

/** Published projects that belong to a workspace folder. */
export const projectsInWorkspace = (
  agents: Record<string, Agent>,
  agentOrder: string[],
  workspaceId: string,
): Agent[] =>
  agentOrder
    .map((id) => agents[id])
    .filter(
      (a): a is Agent =>
        !!a && isProject(a) && !a.draft && agentInWorkspace(a, workspaceId),
    );

/** Workspace-level chats (not projects) plus every child of those projects. */
export const agentsInWorkspaceBoard = (
  agents: Record<string, Agent>,
  agentOrder: string[],
  workspaceId: string,
): Agent[] => {
  const loose = agentOrder
    .map((id) => agents[id])
    .filter((a): a is Agent => !!a && isChatsAgent(a) && agentInWorkspace(a, workspaceId));
  const nested = projectsInWorkspace(agents, agentOrder, workspaceId).flatMap((project) =>
    agentsInProject(agents, agentOrder, project.id),
  );
  return [...loose, ...nested];
};

/** Hidden chat + tracker owner for a workspace folder. Id matches the workspace. */
export function workspaceAgentFrom(workspace: Workspace): Agent {
  return {
    id: workspace.id,
    kind: "workspace",
    workspaceIds: normalizeWorkspaceIds(workspace.id),
    groupParentId: null,
    branch: "main",
    title: workspace.name,
    status: "idle",
    updatedAt: 0,
    messages: [],
  };
}

/** Ensure every workspace has a matching workspace agent. Does not add them
 *  to `agentOrder` — the folder row is the only selector. */
export function ensureWorkspaceAgents(
  workspaces: Record<string, Workspace>,
  agents: Record<string, Agent>,
): Record<string, Agent> {
  let next = agents;
  let copied = false;
  for (const workspace of Object.values(workspaces)) {
    const current = next[workspace.id];
    if (current && !isWorkspace(current)) continue;
    const needsWrite = !current || current.title !== workspace.name;
    if (!needsWrite) continue;
    if (!copied) {
      next = { ...next };
      copied = true;
    }
    next[workspace.id] = current
      ? { ...current, title: workspace.name }
      : workspaceAgentFrom(workspace);
  }
  return next;
}

/** Visible under a project folder when Focus Folders is on.
 *  Elevated children only. Status does not force a listing. */
export function isFocusFolderChild(agent: Agent): boolean {
  if (agent.thread || isProject(agent) || isWorkspace(agent)) return false;
  return !!agent.elevated;
}

/** Sidebar list under a project in Focus Folders mode. */
export const elevatedAgentsInProject = (
  agents: Record<string, Agent>,
  agentOrder: string[],
  projectId: string,
): Agent[] => agentsInProject(agents, agentOrder, projectId).filter(isFocusFolderChild);

function folderChildren(
  groupId: string,
  agents: Record<string, Agent>,
  agentOrder: string[],
): Agent[] {
  const seen = new Set<string>();
  const out: Agent[] = [];
  const add = (child: Agent) => {
    if (seen.has(child.id)) return;
    seen.add(child.id);
    out.push(child);
  };
  for (const child of agentsInProject(agents, agentOrder, groupId)) add(child);
  for (const child of agentsInGroup(agents, agentOrder, groupId)) add(child);
  for (const child of groupsInParent(agents, groupId)) add(child);
  return out;
}

/** Newest child `updatedAt`. Empty folders use the project's own time. */
export function projectFolderUpdatedAt(
  project: Agent,
  agents: Record<string, Agent>,
  agentOrder: string[],
): number {
  const children = folderChildren(project.id, agents, agentOrder);
  let latest = 0;
  for (const child of children) {
    if (child.updatedAt > latest) latest = child.updatedAt;
  }
  return latest > 0 ? latest : project.updatedAt;
}

function folderItemUpdatedAt(
  item: Agent,
  agents: Record<string, Agent>,
  agentOrder: string[],
): number {
  return isTrackerOwner(item) ? projectFolderUpdatedAt(item, agents, agentOrder) : item.updatedAt;
}

/** Shared order for repo folders and project folders. */
export function compareSidebarFolderItems(
  a: Agent,
  b: Agent,
  agents: Record<string, Agent>,
  agentOrder: string[],
): number {
  const time =
    folderItemUpdatedAt(b, agents, agentOrder) - folderItemUpdatedAt(a, agents, agentOrder);
  if (time !== 0) return time;
  return a.id.localeCompare(b.id);
}

export function sortSidebarFolderItems(
  items: Agent[],
  agents: Record<string, Agent>,
  agentOrder: string[],
): Agent[] {
  return items.slice().sort((a, b) => compareSidebarFolderItems(a, b, agents, agentOrder));
}

/** Union of descendant repos, in first-seen order. Empty groups use their
 *  own membership. */
export function projectWorkspaceIds(
  projectId: string,
  agents: Record<string, Agent>,
  agentOrder: string[],
): string[] {
  return descendantWorkspaceIds(projectId, agents, agentOrder);
}

/** Parent group for Projects grouping. Persist heal writes this explicitly.
 *  Projects sit at the top level unless the user nests them. */
export function resolvedGroupParentId(a: Agent): string | null {
  if (a.groupParentId !== undefined) return a.groupParentId;
  if (isWorkspace(a) || isProject(a)) return null;
  if (a.projectId) return a.projectId;
  return primaryWorkspaceId(a);
}

/** Write implicit parents so later moves can set `null` for the top level. */
export function healGroupParents(agents: Record<string, Agent>): Record<string, Agent> {
  let next = agents;
  let copied = false;
  for (const agent of Object.values(agents)) {
    if (agent.groupParentId !== undefined) continue;
    if (!copied) {
      next = { ...agents };
      copied = true;
    }
    next[agent.id] = { ...agent, groupParentId: resolvedGroupParentId(agent) };
  }
  return next;
}

/** One-time: lift projects that still nest under a repo folder. */
export function flattenProjectsOutOfWorkspaces(
  agents: Record<string, Agent>,
): Record<string, Agent> {
  let next = agents;
  let copied = false;
  for (const agent of Object.values(agents)) {
    if (!isProject(agent)) continue;
    const parentId = resolvedGroupParentId(agent);
    if (!parentId || !isWorkspace(agents[parentId])) continue;
    if (!copied) {
      next = { ...agents };
      copied = true;
    }
    next[agent.id] = { ...agent, groupParentId: null };
  }
  return next;
}

function isGroupFolderId(
  id: string,
  agents: Record<string, Agent>,
  workspaces: Record<string, Workspace>,
): boolean {
  const agent = agents[id];
  if (agent && isProject(agent) && !agent.draft) return true;
  return !!workspaces[id] || isWorkspace(agent);
}

/** Default outer folder list: projects first, then repos. */
export function defaultGroupFolderOrder(
  projectOrder: string[],
  workspaceOrder: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...projectOrder, ...workspaceOrder]) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Keep known folder ids. Missing projects go first. Missing repos go last. */
export function healGroupFolderOrder(
  order: string[] | undefined,
  projectOrder: string[],
  workspaceOrder: string[],
  agents: Record<string, Agent>,
  workspaces: Record<string, Workspace>,
): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const id of order ?? []) {
    if (seen.has(id) || !isGroupFolderId(id, agents, workspaces)) continue;
    seen.add(id);
    kept.push(id);
  }
  const missingProjects = projectOrder.filter(
    (id) => !seen.has(id) && isGroupFolderId(id, agents, workspaces),
  );
  const missingRepos = workspaceOrder.filter(
    (id) => !seen.has(id) && isGroupFolderId(id, agents, workspaces),
  );
  return [...missingProjects, ...kept, ...missingRepos];
}

/** Insert a repo after the last project. Does not move existing folders. */
export function insertRepoInGroupFolderOrder(
  order: string[],
  repoId: string,
  agents: Record<string, Agent>,
): string[] {
  if (order.includes(repoId)) return order;
  let lastProject = -1;
  for (let i = 0; i < order.length; i++) {
    if (isProject(agents[order[i]])) lastProject = i;
  }
  const next = order.slice();
  next.splice(lastProject + 1, 0, repoId);
  return next;
}

/** Manual outer-folder order. Unknown items: projects, then repos, then chats. */
export function sortTopLevelGroupFolders(items: Agent[], order: string[]): Agent[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return items.slice().sort((a, b) => {
    const ai = rank.get(a.id);
    const bi = rank.get(b.id);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    const ap = isProject(a) ? 0 : isWorkspace(a) ? 1 : 2;
    const bp = isProject(b) ? 0 : isWorkspace(b) ? 1 : 2;
    if (ap !== bp) return ap - bp;
    return a.id.localeCompare(b.id);
  });
}

/** Tracker-owner folders whose parent is `parentId` (`null` = top level). */
export function groupsInParent(
  agents: Record<string, Agent>,
  parentId: string | null,
): Agent[] {
  const out: Agent[] = [];
  for (const agent of Object.values(agents)) {
    if (!isTrackerOwner(agent) || agent.draft) continue;
    if (resolvedGroupParentId(agent) !== parentId) continue;
    out.push(agent);
  }
  return out;
}

/** Regular chats whose parent group is `groupId`. */
export function agentsInGroup(
  agents: Record<string, Agent>,
  agentOrder: string[],
  groupId: string,
): Agent[] {
  return agentOrder
    .map((id) => agents[id])
    .filter(
      (a): a is Agent =>
        !!a && !a.thread && !isTrackerOwner(a) && resolvedGroupParentId(a) === groupId,
    );
}

/** Group-by-Projects folder body when Focus Folders is on. */
export const focusAgentsInGroup = (
  agents: Record<string, Agent>,
  agentOrder: string[],
  groupId: string,
): Agent[] => agentsInGroup(agents, agentOrder, groupId).filter(isFocusFolderChild);

/** Top-level rows for Projects grouping: unparented groups and loose chats. */
export function topLevelProjectGroupItems(
  agents: Record<string, Agent>,
  agentOrder: string[],
  workspaceOrder: string[],
  pinnedAgents: string[],
): Agent[] {
  const items: Agent[] = [];
  const seen = new Set<string>();
  const add = (agent: Agent) => {
    if (seen.has(agent.id) || agent.thread || agent.draft) return;
    if (isAgentPinned(pinnedAgents, agent.id)) return;
    if (resolvedGroupParentId(agent) !== null) return;
    seen.add(agent.id);
    items.push(agent);
  };
  for (const id of workspaceOrder) {
    const agent = agents[id];
    if (agent && isWorkspace(agent)) add(agent);
  }
  for (const id of agentOrder) {
    const agent = agents[id];
    if (!agent || isWorkspace(agent)) continue;
    add(agent);
  }
  return items;
}

function groupHasNestedGroup(groupId: string, agents: Record<string, Agent>): boolean {
  return groupsInParent(agents, groupId).length > 0;
}

/** A group nests only inside a top-level group. Depth stays at two. */
export function canNestGroup(
  childId: string,
  parentId: string,
  agents: Record<string, Agent>,
): boolean {
  if (childId === parentId) return false;
  const child = agents[childId];
  const parent = agents[parentId];
  if (!isTrackerOwner(child) || !isTrackerOwner(parent)) return false;
  if (resolvedGroupParentId(parent) !== null) return false;
  if (groupHasNestedGroup(childId, agents)) return false;
  const seen = new Set<string>();
  let id: string | null = resolvedGroupParentId(parent);
  while (id) {
    if (id === childId) return false;
    if (seen.has(id)) break;
    seen.add(id);
    id = agents[id] ? resolvedGroupParentId(agents[id]) : null;
  }
  return true;
}

function groupDepth(id: string, agents: Record<string, Agent>): number {
  let depth = 0;
  const seen = new Set<string>();
  let cur: string | null = agents[id] ? resolvedGroupParentId(agents[id]) : null;
  while (cur) {
    if (seen.has(cur)) break;
    seen.add(cur);
    depth += 1;
    cur = agents[cur] ? resolvedGroupParentId(agents[cur]) : null;
  }
  return depth;
}

/** Union of descendant repos. Empty groups keep their own membership. */
export function descendantWorkspaceIds(
  groupId: string,
  agents: Record<string, Agent>,
  agentOrder: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (ids: readonly string[]) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  };
  const walk = (id: string) => {
    for (const child of agentsInProject(agents, agentOrder, id)) {
      add(child.workspaceIds);
    }
    for (const child of agentsInGroup(agents, agentOrder, id)) {
      add(child.workspaceIds);
    }
    for (const child of groupsInParent(agents, id)) {
      walk(child.id);
    }
  };
  walk(groupId);
  if (out.length === 0) {
    const group = agents[groupId];
    if (group) add(group.workspaceIds);
  }
  return out;
}

/** Rewrite each affected group's `workspaceIds` to the union of its children. */
export function syncGroupRepositories(
  agents: Record<string, Agent>,
  agentOrder: string[],
  seeds: readonly (string | null | undefined)[],
): Record<string, Agent> {
  const toSync = new Set<string>();
  for (const seed of seeds) {
    let cur: string | null | undefined = seed;
    const seen = new Set<string>();
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      const agent = agents[cur];
      if (!agent) break;
      if (isTrackerOwner(agent)) toSync.add(cur);
      cur = resolvedGroupParentId(agent);
    }
  }
  if (toSync.size === 0) return agents;
  const ids = [...toSync].sort((a, b) => groupDepth(b, agents) - groupDepth(a, agents));
  let next = agents;
  let copied = false;
  for (const id of ids) {
    const union = descendantWorkspaceIds(id, next, agentOrder);
    if (union.length === 0) continue;
    const current = next[id];
    if (!current) continue;
    const same =
      current.workspaceIds.length === union.length &&
      current.workspaceIds.every((wid, i) => wid === union[i]);
    if (same) continue;
    if (!copied) {
      next = { ...agents };
      copied = true;
    }
    next[id] = { ...current, workspaceIds: normalizeWorkspaceIds(union) };
  }
  return next;
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

/** How the sidebar lists agents. `workspace` is Repositories (folder by
 *  repo). `projects` is freeform groups. `updated` is one recency list. */
export type AgentGroupBy = "workspace" | "updated" | "projects";

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

/** Synthetic folder for a multi-repo project. Not stored in `workspaces`. */
export const UNION_WORKSPACE_PREFIX = "union:";

export const isUnionWorkspaceId = (id: string): boolean =>
  id.startsWith(UNION_WORKSPACE_PREFIX);

export function unionWorkspaceMemberIds(id: string): string[] {
  if (!isUnionWorkspaceId(id)) return [];
  return id.slice(UNION_WORKSPACE_PREFIX.length).split("+").filter(Boolean);
}

/** Member ids sorted by workspace name so "A + B" never also appears as "B + A". */
export function sortedWorkspaceMembers(
  ids: readonly string[],
  workspaces: Record<string, Workspace>,
): string[] {
  return [...new Set(ids.filter((id) => !!workspaces[id]))].sort((a, b) => {
    const byName = workspaces[a].name.localeCompare(workspaces[b].name, undefined, {
      sensitivity: "base",
    });
    return byName !== 0 ? byName : a.localeCompare(b);
  });
}

export function unionWorkspaceId(members: readonly string[]): string {
  return `${UNION_WORKSPACE_PREFIX}${members.join("+")}`;
}

export function unionWorkspaceName(
  members: readonly string[],
  workspaces: Record<string, Workspace>,
): string {
  return members.map((id) => workspaces[id]?.name ?? id).join(" + ");
}

/** One repo folder for a project. Several child repos → existing workspace
 *  with that union name, else a synthetic `union:` folder. */
export function resolveProjectFolder(
  projectId: string,
  agents: Record<string, Agent>,
  agentOrder: string[],
  workspaces: Record<string, Workspace>,
): string {
  const ids = sortedWorkspaceMembers(
    projectWorkspaceIds(projectId, agents, agentOrder),
    workspaces,
  );
  if (ids.length === 0) {
    const project = agents[projectId];
    return project ? primaryWorkspaceId(project) : DEFAULT_WORKSPACE_ID;
  }
  if (ids.length === 1) return ids[0];
  const name = unionWorkspaceName(ids, workspaces);
  const existing = Object.values(workspaces).find((workspace) => workspace.name === name);
  return existing?.id ?? unionWorkspaceId(ids);
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
export type ContentScopeId = string; // "ws:<id>@<branch>" | "project:<id>" | "workspace:<id>" | "agent:<id>"

/** Project that owns this agent's content panel, if any. */
export const contentProjectId = (a: Agent): string | null =>
  isProject(a) ? a.id : (a.projectId ?? null);

export const contentScopeId = (a: Agent): ContentScopeId => {
  if (isWorkspace(a)) return `workspace:${a.id}`;
  const projectId = contentProjectId(a);
  return projectId
    ? `project:${projectId}`
    : `ws:${primaryWorkspaceId(a)}@${a.branch}`;
};

/** Project chats own a private content scope so they do not share workspace tabs. */
export const isProjectScope = (scopeId: ContentScopeId): boolean =>
  scopeId.startsWith("project:");

export const isWorkspaceScope = (scopeId: ContentScopeId): boolean =>
  scopeId.startsWith("workspace:");

/** Project and workspace entity scopes both use a Tracker layout. */
export const isTrackerScope = (scopeId: ContentScopeId): boolean =>
  isProjectScope(scopeId) || isWorkspaceScope(scopeId);

/** Workspace id embedded in a scope id, or null for a standalone-agent scope.
 *  Canonical decoder so the "@<branch>" suffix is split in exactly one place. */
export const workspaceIdOfScope = (scopeId: ContentScopeId): string | null => {
  if (scopeId.startsWith("ws:")) return scopeId.slice(3).split("@")[0];
  if (isWorkspaceScope(scopeId)) return scopeId.slice("workspace:".length);
  return null;
};

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
  review: "Changes",
  project: "Tracker",
  pr: "PR",
  context: "Context",
};

// A Files tab shows a specific open file once `folder` is set (opening a file
// always writes the parent path, including "" for project-root files). Title
// alone is not enough — renaming the default label would otherwise leave stale
// home tabs looking like open files (wrong icon + "src > …" breadcrumb).
export const filesTabHasOpenFile = (tab: Tab): boolean =>
  tab.type === "files" && tab.folder !== undefined;

export const contextTabHasOpenFile = (tab: Tab): boolean =>
  tab.type === "context" && tab.folder !== undefined;

/** Files or Context tab that currently shows a specific file. */
export const treeTabHasOpenFile = (tab: Tab): boolean =>
  filesTabHasOpenFile(tab) || contextTabHasOpenFile(tab);

// New tabs open with their sidebar collapsed by default, except files and context.
export const DEFAULT_SIDEBAR_OPEN: Record<TabType, boolean> = {
  chat: false,
  files: true,
  browser: false,
  terminal: false,
  canvas: false,
  review: false,
  project: false,
  pr: false,
  context: true,
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
  "project",
  "context",
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
