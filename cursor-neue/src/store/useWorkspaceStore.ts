import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Agent,
  ComposerBlock,
  ContentScopeState,
  DropZone,
  LayoutNode,
  PaneKind,
  SplitSide,
  Tab,
  TabType,
  TileNode,
  Workspace,
  WorkspaceOption,
  WorkspaceScope,
} from "@/types";
import {
  canDropInPane,
  contentScopeId,
  PINNED_TAB_ORDER,
  pinnedTabsFor,
  sideToDirection,
  TAB_LABEL,
  workspaceIdOfScope,
  workspaceOptions,
} from "@/types";
import { centeredWindowGeo, type Geo } from "@/components/desktop/geometry";
import { useWindowId } from "@/components/window/WindowContext";
import * as tree from "@/store/layoutTree";
import { docToText } from "@/lib/composerDoc";
import { createSeed } from "@/data/seed";

export const MAIN_WINDOW_ID = "main";

// Where a file picked in the tree should open, relative to the tile it was
// picked from. "here" rewrites the tile's current Files tab (or switches to the
// file if it's already open in this tile); "tab" always opens a new tab;
// "right"/"down" split the tile with the file in the new pane.
export type FileDisposition = "here" | "tab" | "right" | "down";

// Where a thread opens relative to the chat tile it was spawned/reopened from:
// split right when the tile has room, else a new tab (the caller measures).
export type ThreadDisposition = Extract<DropZone, "right" | "tab">;

/** A window is a full app shell with its own view state. Workspaces/agents are
 *  shared globally; everything a window independently controls lives here:
 *  which agent is active, the sidebar/chat collapse flags, and its own per-scope
 *  content. Any window can be closed; closing the last one drops to a desktop
 *  reset state. Tearing off a tab spawns additional windows. */
export interface WindowState {
  id: string;
  activeAgentId: string;
  sidebarCollapsed: boolean;
  chatCollapsed: boolean;
  /** Which workspace the sidebar is filtered to; null = all. Per-window so a
   *  torn-off / drag-spawned window can scope independently. */
  workspaceScope: WorkspaceScope;
  /** Collapsed sidebar workspace groups, by id (absent = expanded). Per-window
   *  so toggling a workspace folder in one window never reorders another's
   *  sidebar. */
  collapsedWorkspaces: Record<string, boolean>;
  /** Content per scope ("ws:<id>@<branch>" | "agent:<id>"), independent of other windows. */
  contentByScope: Record<string, ContentScopeState>;
  /** The agents (chat) pane's layout tree: chat tabs referencing agents via
   *  `Tab.agentId`. Same tree type + transforms as content; per window. */
  chatLayout: LayoutNode;
  /** Last content tile the user pointed into. Retargets a shared (side-by-side
   *  group) sidebar to that pane's active tab. Stale ids fall back gracefully. */
  focusedContentTileId?: string;
  /** Desktop position/size; null until first measured (the main window centers). */
  geo: Geo | null;
}

export interface WorkspaceData {
  // Shared across every window.
  workspaces: Record<string, Workspace>;
  workspaceOrder: string[];
  agents: Record<string, Agent>;
  agentOrder: string[];
  /** Per-workspace pinned tab types. Absent key = the default set (see
   *  `pinnedTabsFor`); a key exists only once the user edits that workspace. */
  pinnedTabs: Record<string, TabType[]>;
  // Per-window view state + desktop stacking order (last = top-most).
  windows: Record<string, WindowState>;
  windowOrder: string[];
}

interface WorkspaceActions {
  // Shell view state — scoped to a window.
  setActiveAgent: (windowId: string, id: string) => void;
  /** Create a new agent in the active agent's workspace, then select + reveal it. */
  createAgent: (windowId: string) => void;
  /** Create a new agent (inheriting the tile's context) as a NEW tab in a chat
   *  tile — the chat tab bar's "+" action. */
  addAgentTab: (tileId: string) => void;
  /** Pointer-down in a chat tile: make its active tab's agent the window's
   *  active agent (swapping the content pane to that agent's branch scope). */
  focusChatTile: (tileId: string) => void;
  /** Pointer-down in a content tile: remember it as the window's focused pane
   *  so resting panes can dim their tab chrome. */
  focusContentTile: (tileId: string) => void;
  /** Drop a sidebar agent row onto a chat tile: merge as a tab (activating an
   *  existing tab of that agent in the tile instead of duplicating) or split. */
  openAgentInTile: (agentId: string, tileId: string, zone: DropZone) => void;
  /** Drop a sidebar agent row onto a chat panel's outer edge: full-span pane. */
  openAgentAtChatRoot: (agentId: string, windowId: string, side: SplitSide) => void;
  /** Drop a sidebar agent row onto the desktop: spawn a window with that agent
   *  active (chat visible, its branch scope in the content pane). */
  openAgentInNewWindow: (agentId: string, geo: Geo) => void;
  /** Archive (remove) an agent, reassigning the active agent of any window that
   *  was showing it. */
  archiveAgent: (id: string) => void;
  /** Create a thread agent from a text selection in `parentAgentId`'s chat and
   *  open it next to `tileId`. */
  createThread: (
    tileId: string,
    parentAgentId: string,
    messageIndex: number,
    excerpt: string,
    disposition: ThreadDisposition,
  ) => void;
  /** Focus an existing thread's chat tab, or open one next to `tileId`. */
  openThread: (tileId: string, threadAgentId: string, disposition: ThreadDisposition) => void;
  /** Append a user message to an agent's conversation (prototype send). */
  sendMessage: (agentId: string, text: string) => void;
  /** Track a composer's unsent text so other surfaces (e.g. the parent chat's
   *  "1 Draft" pill) can react to it. */
  setDraft: (agentId: string, text: string) => void;
  /** Replace the block document behind an agent's expanded writing surface. Its
   *  text is mirrored into the draft, so the small composer and the "1 Draft"
   *  pill track edits made in the surface. Sending clears both. */
  setComposerDoc: (agentId: string, blocks: ComposerBlock[]) => void;
  toggleSidebar: (windowId: string) => void;
  setSidebarCollapsed: (windowId: string, collapsed: boolean) => void;
  toggleChat: (windowId: string) => void;
  /** Maximize the Content pane (collapse sidebar + chat, keep Content open). */
  setMaximized: (windowId: string, maximized: boolean) => void;
  toggleContentOpen: (windowId: string) => void;
  setContentOpen: (windowId: string, open: boolean) => void;
  /** Filter this window's sidebar to a workspace (null = all). */
  setWorkspaceScope: (windowId: string, scope: WorkspaceScope) => void;

  /** Collapse/expand a sidebar workspace group within a single window. */
  toggleWorkspaceCollapsed: (windowId: string, id: string) => void;

  // Content layout — the owning window + scope is resolved from the node id.
  addTab: (tileId: string, type: TabType, overrides?: Partial<Tab>) => void;
  setActiveTab: (tileId: string, tabId: string) => void;
  /** Patch a tab's metadata in place (e.g. Files navigation rewrites the tab). */
  updateTab: (tileId: string, tabId: string, overrides: Partial<Tab>) => void;
  /** Open a file from the tree into the tile that owns `tabId`. See FileDisposition. */
  openFile: (
    tileId: string,
    tabId: string,
    overrides: Partial<Tab>,
    disposition: FileDisposition,
  ) => void;
  /** Open a file as a fresh single-tab window (source tile is left untouched). */
  openFileInNewWindow: (tileId: string, overrides: Partial<Tab>, geo: Geo) => void;
  /** Open a file as a full-span pane on a window/scope's layout root (the
   *  create-a-new-tab counterpart to `moveTabToRoot`, used when a file from the
   *  tree is dropped on a content panel's outer edge). */
  openFileAtRoot: (
    targetWindowId: string,
    targetScopeId: string,
    overrides: Partial<Tab>,
    side: SplitSide,
  ) => void;
  /** Open a window's (closed) content pane and append a file as a new tab (the
   *  create counterpart to `openContentWithTab`). */
  openFileInClosedContent: (
    targetWindowId: string,
    targetScopeId: string,
    overrides: Partial<Tab>,
  ) => void;
  closeTab: (tileId: string, tabId: string) => void;
  closeOtherTabs: (tileId: string, tabId: string) => void;
  splitTile: (tileId: string, side: SplitSide) => void;
  /** `index` (tab-zone drops only) is the insertion slot in the target tile's
   *  tab strip; same source and target tile makes it a reorder. */
  moveTab: (
    sourceTileId: string,
    tabId: string,
    targetTileId: string,
    zone: DropZone,
    index?: number,
  ) => void;
  moveTabToRoot: (
    sourceTileId: string,
    tabId: string,
    targetWindowId: string,
    targetScopeId: string,
    side: SplitSide,
  ) => void;
  /** Move a chat tab onto a chat panel's outer edge for a full-span pane (the
   *  chat counterpart of `moveTabToRoot`; chat roots are per-window, not
   *  per-scope). */
  moveTabToChatRoot: (
    sourceTileId: string,
    tabId: string,
    targetWindowId: string,
    side: SplitSide,
  ) => void;
  /** Open a window's (closed) content pane and append the dragged tab to it. */
  openContentWithTab: (
    sourceTileId: string,
    tabId: string,
    targetWindowId: string,
    targetScopeId: string,
  ) => void;
  closeTile: (tileId: string) => void;
  toggleTileSidebar: (tileId: string, type: TabType) => void;
  setSizes: (splitId: string, sizes: number[]) => void;

  // Pinned tabs (per workspace, shared across windows).
  /** Pin/unpin a tab type for a workspace. */
  togglePinnedTab: (workspaceId: string, type: TabType) => void;
  /** Open a pinned type in the window's active scope: focus an existing tab of
   *  that type, else append one to the first tile. Always opens the pane. */
  openPinnedTab: (windowId: string, type: TabType) => void;

  // Windows.
  openTabInNewWindow: (tileId: string, tabId: string, geo: Geo) => void;
  openTileInNewWindow: (tileId: string, geo: Geo) => void;
  /** Spawn a standalone window pre-filtered to a workspace (the same filter the
   *  footer switcher applies), with normal chrome. */
  openWorkspaceInNewWindow: (workspaceId: string, geo: Geo) => void;
  setWindowGeo: (id: string, geo: Geo) => void;
  focusWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  /** Recreate the main window after every window was closed (the reset state). */
  restoreMainWindow: () => void;

  reset: () => void;
}

/** In-memory only (not persisted): unsent composer content per agent id — the
 *  draft text, plus the block document behind its expanded writing surface. */
interface EphemeralState {
  drafts: Record<string, string>;
  composerDoc: Record<string, ComposerBlock[]>;
}

export type WorkspaceStore = WorkspaceData & EphemeralState & WorkspaceActions;

const defaultScope = (): ContentScopeState => ({
  layout: tree.makeDefaultLayout(),
  open: true,
  cleared: false,
});

/** A fresh chat tab bound to an agent. */
const chatTab = (agent?: Agent): Tab =>
  tree.makeTab("chat", agent ? { agentId: agent.id, title: agent.title } : {});

/** Starting thread title: "New Thread · {parent}", parent capped so the whole
 *  title stays tab-sized. */
const threadTitle = (parentTitle: string): string => {
  const base = parentTitle.replace(/\s+/g, " ").trim();
  return `New Thread · ${base.length > 24 ? `${base.slice(0, 24).trimEnd()}…` : base}`;
};

/** `id` plus every thread agent descending from it (threads can nest). */
const withThreadDescendants = (agents: Record<string, Agent>, id: string): Set<string> => {
  const removed = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const a of Object.values(agents)) {
      if (a.thread && removed.has(a.thread.parentAgentId) && !removed.has(a.id)) {
        removed.add(a.id);
        grew = true;
      }
    }
  }
  return removed;
};

/** A single-tile chat tree showing one agent (the chat pane's default). */
const defaultChatLayout = (agent?: Agent): LayoutNode => tree.makeTile([chatTab(agent)]);

/** Chat-pane backfill for `moveTab`/`moveTabToRoot` self-splits: a mirror clone
 *  of the moving chat tab (same agent, fresh id) — the chat counterpart of the
 *  content pane's fresh Files tab. */
const chatMirror = (moving: Tab): Tab =>
  tree.makeTab("chat", { agentId: moving.agentId, title: moving.title });

/** Which content scope a window currently displays (its active agent's scope). */
const scopeIdOfWindow = (state: WorkspaceData, win: WindowState): string => {
  const agent = state.agents[win.activeAgentId];
  return agent ? contentScopeId(agent) : "agent:none";
};

/** Materialize a workspace's pinned set as real tabs at the strip's leading
 *  edge (see `tree.ensurePinnedTabs`); applied on every content-layout write
 *  and scope creation so island and tab group can never disagree. */
const withPinnedLeading = tree.ensurePinnedTabs;

/** A fresh content scope for a workspace agent: the default layout with the
 *  workspace's pinned tabs seeded in (so the pinned set always exists as real
 *  tabs in the tab group, matching the island). */
const seededScope = (
  pinnedTabs: Record<string, TabType[]>,
  scopeId: string,
): ContentScopeState => ({
  layout: withPinnedLeading(pinnedTabs, scopeId, tree.makeDefaultLayout()),
  open: true,
  cleared: false,
});

/** Open a content scope, reseeding the workspace's main defaults when the
 *  scope was emptied (last tab closed) or has no tabs. An empty pinned override
 *  is dropped so `pinnedTabsFor` falls back to `DEFAULT_PINNED_TABS`. */
const openContentScope = (
  pinnedTabs: Record<string, TabType[]>,
  scopeId: string,
  cur: ContentScopeState,
): { scope: ContentScopeState; pinnedTabs: Record<string, TabType[]> } => {
  const needsSeed = !!cur.cleared || tree.allTabs(cur.layout).length === 0;
  if (!needsSeed) return { scope: { ...cur, open: true, cleared: false }, pinnedTabs };

  let nextPinned = pinnedTabs;
  const workspaceId = workspaceIdOfScope(scopeId);
  // User cleared every pin — restore the main defaults on the next open.
  if (workspaceId && pinnedTabsFor(pinnedTabs, workspaceId).length === 0) {
    const { [workspaceId]: _gone, ...rest } = pinnedTabs;
    nextPinned = rest;
  }
  return {
    pinnedTabs: nextPinned,
    scope: {
      layout: withPinnedLeading(nextPinned, scopeId, tree.makeDefaultLayout()),
      open: true,
      cleared: false,
    },
  };
};

/** Where a layout node lives: a window's chat tree (`pane: "chat"`) or one of
 *  its content scopes (`pane: "content"` + `scopeId`). */
interface NodeLocation {
  windowId: string;
  pane: PaneKind;
  scopeId: string | null;
}

/** Locate the window + container whose layout tree contains a tile/split id.
 *  Node ids are globally unique across chat AND content trees, so layout actions
 *  resolve their full location rather than threading a window/scope through the
 *  component tree. */
const locate = (state: WorkspaceData, nodeId: string): NodeLocation | null => {
  for (const [windowId, win] of Object.entries(state.windows)) {
    for (const [scopeId, scope] of Object.entries(win.contentByScope)) {
      if (tree.hasNode(scope.layout, nodeId)) return { windowId, pane: "content", scopeId };
    }
    if (tree.hasNode(win.chatLayout, nodeId)) return { windowId, pane: "chat", scopeId: null };
  }
  return null;
};

/** The layout tree at a location. */
const layoutAt = (state: WorkspaceData, loc: NodeLocation): LayoutNode => {
  const win = state.windows[loc.windowId];
  if (loc.pane === "chat") return win.chatLayout;
  return (win.contentByScope[loc.scopeId ?? ""] ?? defaultScope()).layout;
};

/** Point a window at `agent`: set `activeAgentId` and lazily seed its content
 *  scope (the single seam that swaps the right-hand pane per branch context).
 *  Runs only inside actions, so it reads the live pinned sets off the store to
 *  seed the workspace's pinned tabs into a fresh scope. */
const withActiveAgent = (win: WindowState, agent: Agent): WindowState => {
  const scopeId = contentScopeId(agent);
  if (win.contentByScope[scopeId]) return { ...win, activeAgentId: agent.id };
  return {
    ...win,
    activeAgentId: agent.id,
    contentByScope: {
      ...win.contentByScope,
      [scopeId]: seededScope(useWorkspaceStore.getState().pinnedTabs, scopeId),
    },
  };
};

/** Apply a reduced chat layout to a window. The chat tree never empties: when
 *  the last chat tab closes/leaves, reseed a tab for the active agent and
 *  collapse the chat pane (forcing content open — never both hidden), mirroring
 *  the main window's content-emptied behavior. */
const reduceChat = (
  agents: Record<string, Agent>,
  win: WindowState,
  layout: LayoutNode | null,
): WindowState => {
  if (layout !== null) return { ...win, chatLayout: layout };
  const agent = agents[win.activeAgentId];
  const sid = agent ? contentScopeId(agent) : "agent:none";
  const cur =
    win.contentByScope[sid] ?? seededScope(useWorkspaceStore.getState().pinnedTabs, sid);
  return {
    ...win,
    chatLayout: defaultChatLayout(agent),
    chatCollapsed: true,
    contentByScope: cur.open
      ? win.contentByScope
      : { ...win.contentByScope, [sid]: { ...cur, open: true } },
  };
};

/** Re-establish the invariant `activeAgentId` = an agent still shown by a chat
 *  tab. If the active agent's tab left this window, follow the active tab of
 *  `preferTileId` (the mutated tile, when known), else the first tile's. */
const syncActiveAgent = (
  agents: Record<string, Agent>,
  win: WindowState,
  preferTileId?: string,
): WindowState => {
  if (
    agents[win.activeAgentId] &&
    tree.findTab(win.chatLayout, (t) => t.agentId === win.activeAgentId)
  )
    return win;
  const tile =
    (preferTileId ? tree.findTile(win.chatLayout, preferTileId) : null) ??
    tree.firstTile(win.chatLayout);
  const activeTab = tile.tabs.find((t) => t.id === tile.activeTabId) ?? tile.tabs[0];
  const agent = activeTab?.agentId ? agents[activeTab.agentId] : undefined;
  return agent ? withActiveAgent(win, agent) : win;
};

/** The chat tile "in focus": the one whose active tab shows the window's active
 *  agent, else the first tile. Sidebar selection rewrites this tile's active tab
 *  in place (no tab accumulation). */
const focusedChatTile = (win: WindowState): TileNode => {
  const find = (node: LayoutNode): TileNode | null => {
    if (tree.isTile(node)) {
      const active = node.tabs.find((t) => t.id === node.activeTabId);
      return active?.agentId === win.activeAgentId ? node : null;
    }
    for (const child of node.children) {
      const found = find(child);
      if (found) return found;
    }
    return null;
  };
  return find(win.chatLayout) ?? tree.firstTile(win.chatLayout);
};

/** Fresh "New Agent" with no prompt yet — reuse instead of stacking empties.
 *  Deliberately NOT a type predicate: a false result still allows an Agent
 *  (a non-blank one), and `agent is Agent` would narrow that branch away. */
const isBlankAgent = (
  agent: Agent | undefined,
  drafts: Record<string, string>,
): boolean =>
  !!agent &&
  !agent.thread &&
  agent.messages.length === 0 &&
  (drafts[agent.id] ?? "").trim() === "";

/** Apply a reduced layout to one of a window's scopes. A null layout means the
 *  scope emptied. Auto-closing on empty is reserved for spawned windows (so a
 *  torn-off single-tab window disappears when its tab leaves); the main window
 *  instead collapses its content pane and marks the scope cleared (island
 *  hides; the next open reseeds the main defaults). Closing the last tab never
 *  nukes the primary window (use the close button). */
const reduceWindow = (
  win: WindowState,
  scopeId: string,
  layout: LayoutNode | null,
): WindowState | null => {
  const cur = win.contentByScope[scopeId] ?? defaultScope();
  if (layout !== null) {
    return {
      ...win,
      contentByScope: {
        ...win.contentByScope,
        [scopeId]: { ...cur, layout, cleared: false },
      },
    };
  }
  if (win.id !== MAIN_WINDOW_ID) return null;
  return {
    ...win,
    contentByScope: {
      ...win.contentByScope,
      [scopeId]: {
        ...cur,
        // Placeholder only — not shown in the island (`cleared`) and replaced
        // with the workspace's main defaults the next time content opens.
        layout: tree.makeDefaultLayout(),
        open: false,
        cleared: true,
      },
    },
  };
};

/** Commit a (possibly reduced-to-null) window back into the windows map + order,
 *  removing it when it closed. */
const commitWindow = (
  data: Pick<WorkspaceData, "windows" | "windowOrder">,
  windowId: string,
  next: WindowState | null,
): Pick<WorkspaceData, "windows" | "windowOrder"> => {
  if (next) {
    return { windows: { ...data.windows, [windowId]: next }, windowOrder: data.windowOrder };
  }
  const { [windowId]: _gone, ...windows } = data.windows;
  return { windows, windowOrder: data.windowOrder.filter((id) => id !== windowId) };
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => {
      const patchWindow = (windowId: string, patch: Partial<WindowState>) => {
        const state = get();
        const win = state.windows[windowId];
        if (!win) return;
        set({ windows: { ...state.windows, [windowId]: { ...win, ...patch } } });
      };

      // Apply a layout transform to the container (chat tree or content scope)
      // that owns `nodeId`. Chat mutations re-sync the active agent afterwards,
      // preferring the mutated tile's active tab (e.g. after a close).
      const mutateNodeLayout = (nodeId: string, fn: (layout: LayoutNode) => LayoutNode | null) => {
        const state = get();
        const loc = locate(state, nodeId);
        if (!loc) return;
        const win = state.windows[loc.windowId];
        if (loc.pane === "chat") {
          const reduced = reduceChat(state.agents, win, fn(win.chatLayout));
          const next = syncActiveAgent(state.agents, reduced, nodeId);
          set({ windows: { ...state.windows, [loc.windowId]: next } });
          return;
        }
        const scopeId = loc.scopeId ?? "";
        const cur = win.contentByScope[scopeId] ?? defaultScope();
        const reduced = fn(cur.layout);
        const next = reduceWindow(
          win,
          scopeId,
          reduced && withPinnedLeading(state.pinnedTabs, scopeId, reduced),
        );
        set(commitWindow(state, loc.windowId, next));
      };

      // Spawn a maximized (sidebar + chat collapsed) window that adopts `srcWin`'s
      // active agent and shows `layout` in that agent's scope. Reduces the source
      // scope and commits both in one atomic update.
      const spawnWindow = (
        srcWindowId: string,
        scopeId: string,
        reducedSrc: LayoutNode | null,
        layout: LayoutNode,
        geo: Geo,
      ) => {
        const state = get();
        const srcWin = state.windows[srcWindowId];
        if (!srcWin) return;
        const winId = tree.uid("win");
        const newWin: WindowState = {
          id: winId,
          activeAgentId: srcWin.activeAgentId,
          sidebarCollapsed: true,
          chatCollapsed: true,
          // Inherit the source window's scope so a torn-off window keeps the same filter.
          workspaceScope: srcWin.workspaceScope,
          // Inherit collapse view too, but as a fresh copy so later toggles diverge.
          collapsedWorkspaces: { ...srcWin.collapsedWorkspaces },
          contentByScope: { [scopeId]: { layout, open: true } },
          chatLayout: defaultChatLayout(state.agents[srcWin.activeAgentId]),
          geo,
        };
        const reduced = commitWindow(state, srcWindowId, reduceWindow(srcWin, scopeId, reducedSrc));
        set({
          windows: { ...reduced.windows, [winId]: newWin },
          windowOrder: [...reduced.windowOrder, winId],
        });
      };

      // Spawn a window around a torn-off chat tile/tab: the moved agent becomes
      // active (its branch scope seeds the content pane) and the chat pane stays
      // visible. Reduces the source chat tree in the same atomic update.
      const spawnChatWindow = (
        srcWindowId: string,
        reducedSrc: LayoutNode | null,
        chatLayout: LayoutNode,
        agentId: string | undefined,
        geo: Geo,
      ) => {
        const state = get();
        const srcWin = state.windows[srcWindowId];
        if (!srcWin) return;
        const agent =
          (agentId ? state.agents[agentId] : undefined) ?? state.agents[srcWin.activeAgentId];
        const scopeId = agent ? contentScopeId(agent) : "agent:none";
        const winId = tree.uid("win");
        const newWin: WindowState = {
          id: winId,
          activeAgentId: agent?.id ?? "",
          sidebarCollapsed: true,
          chatCollapsed: false,
          workspaceScope: srcWin.workspaceScope,
          collapsedWorkspaces: { ...srcWin.collapsedWorkspaces },
          contentByScope: { [scopeId]: seededScope(state.pinnedTabs, scopeId) },
          chatLayout,
          geo,
        };
        const srcNext = syncActiveAgent(
          state.agents,
          reduceChat(state.agents, srcWin, reducedSrc),
        );
        set({
          windows: { ...state.windows, [srcWindowId]: srcNext, [winId]: newWin },
          windowOrder: [...state.windowOrder, winId],
        });
      };

      return {
        ...createSeed(),
        drafts: {},
        composerDoc: {},

        // Sidebar selection: if the agent already has a chat tab, activate it in
        // its tile; otherwise rewrite the focused tile's active tab in place (no
        // tab accumulation from the sidebar). Either way the agent becomes
        // active, swapping the content pane to its branch scope.
        setActiveAgent: (windowId, id) => {
          const state = get();
          const win = state.windows[windowId];
          const agent = state.agents[id];
          if (!win || !agent) return;
          const existing = tree.findTab(win.chatLayout, (t) => t.agentId === id);
          let chatLayout: LayoutNode;
          if (existing) {
            chatLayout = tree.setActiveTab(win.chatLayout, existing.tile.id, existing.tab.id);
          } else {
            const focused = focusedChatTile(win);
            chatLayout = tree.updateTab(win.chatLayout, focused.id, focused.activeTabId, {
              agentId: id,
              title: agent.title,
            });
          }
          set({
            windows: {
              ...state.windows,
              [windowId]: withActiveAgent({ ...win, chatLayout }, agent),
            },
          });
        },

        createAgent: (windowId) => {
          const state = get();
          const win = state.windows[windowId];
          if (!win) return;
          // Already on a blank new agent (no messages, empty prompt) — just
          // reveal it; don't orphan another empty row in the sidebar.
          const active = state.agents[win.activeAgentId];
          if (isBlankAgent(active, state.drafts)) {
            if (win.chatCollapsed) patchWindow(windowId, { chatCollapsed: false });
            return;
          }
          // Inherit the active agent's workspace + branch so the new agent lands
          // in the same group and shares its content scope (standalone -> standalone).
          const workspaceId = active?.workspaceId ?? null;
          const branch = active?.branch ?? "main";
          const id = tree.uid("a");
          const title = "New Agent";
          const newAgent: Agent = {
            id,
            workspaceId,
            branch,
            title,
            status: "idle",
            updatedAt: Date.now(),
            messages: [],
          };
          const scopeId = contentScopeId(newAgent);
          // Like sidebar selection, show the new agent in the focused tile's
          // active tab (rewrite in place, no accumulation).
          const focused = focusedChatTile(win);
          const chatLayout = tree.updateTab(win.chatLayout, focused.id, focused.activeTabId, {
            agentId: id,
            title,
          });
          set({
            agents: { ...state.agents, [id]: newAgent },
            // Prepend so the row stays within the group's first VISIBLE rows
            // (WorkspaceGroup slices the list) rather than hiding behind "See more".
            agentOrder: [id, ...state.agentOrder],
            windows: {
              ...state.windows,
              [windowId]: {
                ...win,
                activeAgentId: id,
                chatCollapsed: false,
                chatLayout,
                // Filtered sidebar -> focus the new agent's workspace (or All for a
                // standalone agent, which only lists when scope is null). All stays All.
                workspaceScope: win.workspaceScope === null ? null : workspaceId,
                // Reveal its group (no-op for a standalone agent).
                collapsedWorkspaces: workspaceId
                  ? { ...win.collapsedWorkspaces, [workspaceId]: false }
                  : win.collapsedWorkspaces,
                // Respect the workspace's existing side pane; lazily seed only if
                // this window hasn't shown the scope yet (mirrors setActiveAgent).
                contentByScope: win.contentByScope[scopeId]
                  ? win.contentByScope
                  : { ...win.contentByScope, [scopeId]: seededScope(state.pinnedTabs, scopeId) },
              },
            },
          });
        },

        addAgentTab: (tileId) => {
          const state = get();
          const loc = locate(state, tileId);
          if (!loc || loc.pane !== "chat") return;
          const win = state.windows[loc.windowId];
          const tile = tree.findTile(win.chatLayout, tileId);
          if (!tile) return;
          // Inherit workspace + branch from the tile's active agent (fallback:
          // the window's active agent), like `createAgent`.
          const context = tile.tabs.find((t) => t.id === tile.activeTabId);
          const base =
            (context?.agentId ? state.agents[context.agentId] : undefined) ??
            state.agents[win.activeAgentId];
          // Active tab is already a blank new agent — don't stack another empty tab.
          if (isBlankAgent(base, state.drafts)) return;
          const id = tree.uid("a");
          const title = "New Agent";
          const newAgent: Agent = {
            id,
            workspaceId: base?.workspaceId ?? null,
            branch: base?.branch ?? "main",
            title,
            status: "idle",
            updatedAt: Date.now(),
            messages: [],
          };
          const chatLayout = tree.addTab(win.chatLayout, tileId, "chat", { agentId: id, title });
          set({
            agents: { ...state.agents, [id]: newAgent },
            agentOrder: [id, ...state.agentOrder],
            windows: {
              ...state.windows,
              [loc.windowId]: withActiveAgent({ ...win, chatLayout }, newAgent),
            },
          });
        },

        focusContentTile: (tileId) => {
          const state = get();
          const loc = locate(state, tileId);
          if (!loc || loc.pane !== "content") return;
          if (state.windows[loc.windowId].focusedContentTileId === tileId) return;
          patchWindow(loc.windowId, { focusedContentTileId: tileId });
        },

        focusChatTile: (tileId) => {
          const state = get();
          const loc = locate(state, tileId);
          if (!loc || loc.pane !== "chat") return;
          const win = state.windows[loc.windowId];
          const tile = tree.findTile(win.chatLayout, tileId);
          const tab = tile?.tabs.find((t) => t.id === tile.activeTabId);
          const agent = tab?.agentId ? state.agents[tab.agentId] : undefined;
          if (!agent || win.activeAgentId === agent.id) return;
          set({ windows: { ...state.windows, [loc.windowId]: withActiveAgent(win, agent) } });
        },

        openAgentInTile: (agentId, tileId, zone) => {
          const state = get();
          const loc = locate(state, tileId);
          const agent = state.agents[agentId];
          if (!loc || loc.pane !== "chat" || !agent) return;
          const win = state.windows[loc.windowId];
          const tile = tree.findTile(win.chatLayout, tileId);
          if (!tile) return;
          // Merging into a tile that already shows this agent activates the
          // existing tab instead of duplicating it (splits still mirror).
          const existing = zone === "tab" ? tile.tabs.find((t) => t.agentId === agentId) : undefined;
          const chatLayout = existing
            ? tree.setActiveTab(win.chatLayout, tileId, existing.id)
            : tree.insertTabIntoTile(win.chatLayout, tileId, chatTab(agent), zone);
          set({
            windows: {
              ...state.windows,
              [loc.windowId]: withActiveAgent({ ...win, chatLayout }, agent),
            },
          });
        },

        openAgentAtChatRoot: (agentId, windowId, side) => {
          const state = get();
          const win = state.windows[windowId];
          const agent = state.agents[agentId];
          if (!win || !agent) return;
          const chatLayout = tree.insertTabAtRoot(win.chatLayout, chatTab(agent), side);
          set({
            windows: {
              ...state.windows,
              [windowId]: withActiveAgent({ ...win, chatLayout, chatCollapsed: false }, agent),
            },
          });
        },

        openAgentInNewWindow: (agentId, geo) => {
          const state = get();
          const agent = state.agents[agentId];
          if (!agent) return;
          const scopeId = contentScopeId(agent);
          const winId = tree.uid("win");
          const newWin: WindowState = {
            id: winId,
            activeAgentId: agentId,
            sidebarCollapsed: false,
            chatCollapsed: false,
            // Filter the new window's sidebar to the agent's workspace (all
            // workspaces for a standalone agent), like the workspace-row drag.
            workspaceScope: agent.workspaceId,
            collapsedWorkspaces: {},
            contentByScope: { [scopeId]: seededScope(state.pinnedTabs, scopeId) },
            chatLayout: defaultChatLayout(agent),
            geo,
          };
          set({
            windows: { ...state.windows, [winId]: newWin },
            windowOrder: [...state.windowOrder, winId],
          });
        },

        archiveAgent: (id) => {
          const state = get();
          const target = state.agents[id];
          if (!target) return;
          // Threads live and die with their parent chat, so cascade the removal
          // (drafts included — a removed thread's unsent text has no home).
          const removedIds = withThreadDescendants(state.agents, id);
          const agentOrder = state.agentOrder.filter((a) => !removedIds.has(a));
          const agents: Record<string, Agent> = {};
          for (const [aid, a] of Object.entries(state.agents)) {
            if (!removedIds.has(aid)) agents[aid] = a;
          }
          const drafts = Object.fromEntries(
            Object.entries(state.drafts).filter(([aid]) => !removedIds.has(aid)),
          );
          const composerDoc = Object.fromEntries(
            Object.entries(state.composerDoc).filter(([aid]) => !removedIds.has(aid)),
          );
          // Strip the agent's chat tabs from every window; a window whose chat
          // tree emptied (or whose active agent was archived with no other tabs)
          // falls back to a same-workspace sibling, then any remaining agent.
          const windows = { ...state.windows };
          for (const winId of state.windowOrder) {
            const win = windows[winId];
            if (!win) continue;
            const stripped = tree.filterTabs(
              win.chatLayout,
              (t) => !t.agentId || !removedIds.has(t.agentId),
            );
            if (stripped) {
              // Other chat tabs remain: follow them for the new active agent.
              windows[winId] = syncActiveAgent(agents, { ...win, chatLayout: stripped });
              continue;
            }
            const fallbackId =
              agentOrder.find((aid) => agents[aid]?.workspaceId === target.workspaceId) ??
              agentOrder[0] ??
              "";
            const fallback = agents[fallbackId];
            const reseeded: WindowState = {
              ...win,
              activeAgentId: fallbackId,
              chatLayout: defaultChatLayout(fallback),
            };
            windows[winId] = fallback ? withActiveAgent(reseeded, fallback) : reseeded;
          }
          set({ agents, agentOrder, windows, drafts, composerDoc });
        },

        createThread: (tileId, parentAgentId, messageIndex, excerpt, disposition) => {
          const state = get();
          const loc = locate(state, tileId);
          const parent = state.agents[parentAgentId];
          if (!loc || loc.pane !== "chat" || !parent) return;
          const win = state.windows[loc.windowId];
          const id = tree.uid("a");
          const title = threadTitle(parent.title);
          const threadAgent: Agent = {
            id,
            // Inherit the parent's context so the content pane's scope doesn't
            // swap when the thread takes focus.
            workspaceId: parent.workspaceId,
            branch: parent.branch,
            title,
            status: "idle",
            updatedAt: Date.now(),
            messages: [],
            thread: { parentAgentId, messageIndex, excerpt },
          };
          const chatLayout = tree.insertTabIntoTile(
            win.chatLayout,
            tileId,
            chatTab(threadAgent),
            disposition,
          );
          set({
            // Thread agents are deliberately NOT added to `agentOrder`: they
            // surface via the parent's "N Replies" pill, not the sidebar.
            agents: { ...state.agents, [id]: threadAgent },
            windows: {
              ...state.windows,
              [loc.windowId]: withActiveAgent({ ...win, chatLayout }, threadAgent),
            },
          });
        },

        openThread: (tileId, threadAgentId, disposition) => {
          const state = get();
          const loc = locate(state, tileId);
          const agent = state.agents[threadAgentId];
          if (!loc || loc.pane !== "chat" || !agent) return;
          const win = state.windows[loc.windowId];
          const existing = tree.findTab(win.chatLayout, (t) => t.agentId === threadAgentId);
          const chatLayout = existing
            ? tree.setActiveTab(win.chatLayout, existing.tile.id, existing.tab.id)
            : tree.insertTabIntoTile(win.chatLayout, tileId, chatTab(agent), disposition);
          set({
            windows: {
              ...state.windows,
              [loc.windowId]: withActiveAgent({ ...win, chatLayout }, agent),
            },
          });
        },

        sendMessage: (agentId, text) => {
          const state = get();
          const agent = state.agents[agentId];
          const trimmed = text.trim();
          if (!agent || !trimmed) return;
          // Sending consumes the composer's unsent content.
          const { [agentId]: _sent, ...drafts } = state.drafts;
          const { [agentId]: _doc, ...composerDoc } = state.composerDoc;
          set({
            agents: {
              ...state.agents,
              [agentId]: {
                ...agent,
                messages: [...agent.messages, { role: "user", text: trimmed }],
                updatedAt: Date.now(),
              },
            },
            drafts,
            composerDoc,
          });
        },

        setDraft: (agentId, text) => {
          const { drafts } = get();
          if ((drafts[agentId] ?? "") === text) return;
          set({ drafts: { ...drafts, [agentId]: text } });
        },

        setComposerDoc: (agentId, blocks) => {
          const { composerDoc, drafts } = get();
          const text = docToText(blocks);
          set({
            composerDoc: { ...composerDoc, [agentId]: blocks },
            drafts: (drafts[agentId] ?? "") === text ? drafts : { ...drafts, [agentId]: text },
          });
        },

        toggleSidebar: (windowId) => {
          const win = get().windows[windowId];
          if (win) patchWindow(windowId, { sidebarCollapsed: !win.sidebarCollapsed });
        },
        setSidebarCollapsed: (windowId, sidebarCollapsed) =>
          patchWindow(windowId, { sidebarCollapsed }),
        // Content is the only visible pane both when maximized and when restored
        // to the split, so force it open — covers returning from a maximized Chat,
        // which had closed Content.
        setMaximized: (windowId, maximized) => {
          const state = get();
          const win = state.windows[windowId];
          if (!win) return;
          const sid = scopeIdOfWindow(state, win);
          const cur = win.contentByScope[sid] ?? seededScope(state.pinnedTabs, sid);
          set({
            windows: {
              ...state.windows,
              [windowId]: {
                ...win,
                sidebarCollapsed: maximized,
                chatCollapsed: maximized,
                contentByScope: cur.open
                  ? win.contentByScope
                  : { ...win.contentByScope, [sid]: { ...cur, open: true } },
              },
            },
          });
        },
        // Collapsing chat forces the window's content open (the two panes are
        // never both hidden), in one atomic set.
        toggleChat: (windowId) => {
          const state = get();
          const win = state.windows[windowId];
          if (!win) return;
          const chatCollapsed = !win.chatCollapsed;
          if (!chatCollapsed) {
            set({ windows: { ...state.windows, [windowId]: { ...win, chatCollapsed } } });
            return;
          }
          const sid = scopeIdOfWindow(state, win);
          const cur = win.contentByScope[sid] ?? seededScope(state.pinnedTabs, sid);
          set({
            windows: {
              ...state.windows,
              [windowId]: {
                ...win,
                chatCollapsed,
                contentByScope: cur.open
                  ? win.contentByScope
                  : { ...win.contentByScope, [sid]: { ...cur, open: true } },
              },
            },
          });
        },

        // Pure toggle of the Content pane: only `open` flips, leaving the sidebar
        // and chat exactly as set so the prior arrangement is restored on the
        // round trip (e.g. toggling Content while the agent pane is collapsed must
        // not re-open it). The visual never-both-hidden rule still holds because
        // MainContainer renders the Chat pane whenever Content is closed,
        // regardless of `chatCollapsed`.
        toggleContentOpen: (windowId) => {
          const state = get();
          const win = state.windows[windowId];
          if (!win) return;
          const sid = scopeIdOfWindow(state, win);
          const cur = win.contentByScope[sid] ?? seededScope(state.pinnedTabs, sid);
          if (cur.open) {
            set({
              windows: {
                ...state.windows,
                [windowId]: {
                  ...win,
                  contentByScope: { ...win.contentByScope, [sid]: { ...cur, open: false } },
                },
              },
            });
            return;
          }
          const { scope, pinnedTabs } = openContentScope(state.pinnedTabs, sid, cur);
          set({
            pinnedTabs,
            windows: {
              ...state.windows,
              [windowId]: {
                ...win,
                contentByScope: { ...win.contentByScope, [sid]: scope },
              },
            },
          });
        },
        setContentOpen: (windowId, open) => {
          const state = get();
          const win = state.windows[windowId];
          if (!win) return;
          const sid = scopeIdOfWindow(state, win);
          const cur = win.contentByScope[sid] ?? seededScope(state.pinnedTabs, sid);
          if (!open) {
            set({
              windows: {
                ...state.windows,
                [windowId]: {
                  ...win,
                  contentByScope: { ...win.contentByScope, [sid]: { ...cur, open: false } },
                },
              },
            });
            return;
          }
          const { scope, pinnedTabs } = openContentScope(state.pinnedTabs, sid, cur);
          set({
            pinnedTabs,
            windows: {
              ...state.windows,
              [windowId]: {
                ...win,
                contentByScope: { ...win.contentByScope, [sid]: scope },
              },
            },
          });
        },

        setWorkspaceScope: (windowId, scope) => patchWindow(windowId, { workspaceScope: scope }),

        toggleWorkspaceCollapsed: (windowId, id) => {
          const win = get().windows[windowId];
          if (!win) return;
          const current = win.collapsedWorkspaces ?? {};
          patchWindow(windowId, {
            collapsedWorkspaces: { ...current, [id]: !current[id] },
          });
        },

        addTab: (tileId, type, overrides) =>
          mutateNodeLayout(tileId, (l) => tree.addTab(l, tileId, type, overrides)),
        // Selecting a chat tab also activates its agent (swapping the content
        // pane to that agent's branch scope); content tabs just switch.
        setActiveTab: (tileId, tabId) => {
          const state = get();
          const loc = locate(state, tileId);
          if (!loc) return;
          if (loc.pane === "chat") {
            const win = state.windows[loc.windowId];
            const chatLayout = tree.setActiveTab(win.chatLayout, tileId, tabId);
            const tab = tree.findTile(chatLayout, tileId)?.tabs.find((t) => t.id === tabId);
            const agent = tab?.agentId ? state.agents[tab.agentId] : undefined;
            const base = { ...win, chatLayout };
            set({
              windows: {
                ...state.windows,
                [loc.windowId]: agent ? withActiveAgent(base, agent) : base,
              },
            });
            return;
          }
          mutateNodeLayout(tileId, (l) => tree.setActiveTab(l, tileId, tabId));
        },
        updateTab: (tileId, tabId, overrides) =>
          mutateNodeLayout(tileId, (l) => tree.updateTab(l, tileId, tabId, overrides)),

        openFile: (tileId, tabId, overrides, disposition) => {
          const state = get();
          const loc = locate(state, tileId);
          if (!loc || loc.pane !== "content") return;
          const scope = state.windows[loc.windowId].contentByScope[loc.scopeId ?? ""];
          const tile = scope ? tree.findTile(scope.layout, tileId) : null;
          if (!tile) return;

          if (disposition === "tab") {
            mutateNodeLayout(tileId, (l) => tree.addTab(l, tileId, "files", overrides));
            return;
          }
          if (disposition === "right" || disposition === "down") {
            mutateNodeLayout(tileId, (l) =>
              tree.insertTabIntoTile(l, tileId, tree.makeTab("files", overrides), disposition, tile),
            );
            return;
          }
          // "here": if this file is already open in the tile, just switch to that
          // tab (they share the sidebar), else rewrite the current tab in place.
          // The current tab wins when it already matches, so re-opening the file
          // you're already on keeps you put rather than jumping to another instance.
          const isSameFile = (tab: Tab) =>
            tab.type === "files" &&
            tab.title === overrides.title &&
            (tab.folder ?? "") === (overrides.folder ?? "");
          const current = tile.tabs.find((tab) => tab.id === tabId);
          const open = current && isSameFile(current) ? current : tile.tabs.find(isSameFile);
          mutateNodeLayout(tileId, (l) =>
            open ? tree.setActiveTab(l, tileId, open.id) : tree.updateTab(l, tileId, tabId, overrides),
          );
        },

        openFileInNewWindow: (tileId, overrides, geo) => {
          const state = get();
          const loc = locate(state, tileId);
          if (!loc || loc.pane !== "content") return;
          const scope = state.windows[loc.windowId].contentByScope[loc.scopeId ?? ""];
          if (!scope) return;
          // Source layout is passed through unchanged (reduce = no-op): the file
          // opens in a brand-new window without detaching anything.
          spawnWindow(
            loc.windowId,
            loc.scopeId ?? "",
            scope.layout,
            tree.makeTile([tree.makeTab("files", overrides)]),
            geo,
          );
        },
        openFileAtRoot: (targetWindowId, targetScopeId, overrides, side) => {
          const state = get();
          const tgtWin = state.windows[targetWindowId];
          if (!tgtWin) return;
          const tgtScope = tgtWin.contentByScope[targetScopeId] ?? defaultScope();
          const layout = withPinnedLeading(
            state.pinnedTabs,
            targetScopeId,
            tree.insertTabAtRoot(tgtScope.layout, tree.makeTab("files", overrides), side),
          );
          set({
            windows: {
              ...state.windows,
              [targetWindowId]: {
                ...tgtWin,
                contentByScope: {
                  ...tgtWin.contentByScope,
                  [targetScopeId]: { ...tgtScope, layout, open: true },
                },
              },
            },
          });
        },

        openFileInClosedContent: (targetWindowId, targetScopeId, overrides) => {
          const state = get();
          const tgtWin = state.windows[targetWindowId];
          if (!tgtWin) return;
          const tgtScope = tgtWin.contentByScope[targetScopeId] ?? defaultScope();
          // Append into the target panel's first tile and open the pane.
          const landing = tree.firstTile(tgtScope.layout);
          const layout = withPinnedLeading(
            state.pinnedTabs,
            targetScopeId,
            tree.insertTabIntoTile(tgtScope.layout, landing.id, tree.makeTab("files", overrides), "tab"),
          );
          set({
            windows: {
              ...state.windows,
              [targetWindowId]: {
                ...tgtWin,
                contentByScope: {
                  ...tgtWin.contentByScope,
                  [targetScopeId]: { ...tgtScope, layout, open: true },
                },
              },
            },
          });
        },
        closeTab: (tileId, tabId) => mutateNodeLayout(tileId, (l) => tree.closeTab(l, tileId, tabId)),
        closeOtherTabs: (tileId, tabId) =>
          mutateNodeLayout(tileId, (l) => tree.closeOtherTabs(l, tileId, tabId)),
        splitTile: (tileId, side) =>
          mutateNodeLayout(tileId, (l) => tree.splitTile(l, tileId, sideToDirection(side))),
        closeTile: (tileId) => mutateNodeLayout(tileId, (l) => tree.closeTile(l, tileId)),
        toggleTileSidebar: (tileId, type) =>
          mutateNodeLayout(tileId, (l) => tree.toggleTileSidebar(l, tileId, type)),
        setSizes: (splitId, sizes) =>
          mutateNodeLayout(splitId, (l) => tree.setSizes(l, splitId, sizes)),

        togglePinnedTab: (workspaceId, type) => {
          const state = get();
          const current = pinnedTabsFor(state.pinnedTabs, workspaceId);
          // Rebuild from the canonical type order so the pinned list never
          // depends on the sequence of pin/unpin clicks.
          const next = PINNED_TAB_ORDER.filter((t) =>
            t === type ? !current.includes(t) : current.includes(t),
          );
          // Re-home live strips: a newly pinned type's tab moves to the leading
          // edge in every window/scope of this workspace, right away.
          const nextPinnedTabs = { ...state.pinnedTabs, [workspaceId]: next };
          const windows = { ...state.windows };
          for (const [winId, win] of Object.entries(windows)) {
            let contentByScope = win.contentByScope;
            for (const [sid, scope] of Object.entries(win.contentByScope)) {
              if (workspaceIdOfScope(sid) !== workspaceId) continue;
              const layout = withPinnedLeading(nextPinnedTabs, sid, scope.layout);
              if (layout === scope.layout) continue;
              contentByScope = { ...contentByScope, [sid]: { ...scope, layout } };
            }
            if (contentByScope !== win.contentByScope) windows[winId] = { ...win, contentByScope };
          }
          set({ pinnedTabs: nextPinnedTabs, windows });
        },

        openPinnedTab: (windowId, type) => {
          const state = get();
          const win = state.windows[windowId];
          if (!win) return;
          const sid = scopeIdOfWindow(state, win);
          const cur = win.contentByScope[sid] ?? seededScope(state.pinnedTabs, sid);
          // Cleared scopes have only a placeholder tile — reseed defaults first
          // so the pinned type lands in a real strip, then focus/add it.
          const base = cur.cleared
            ? openContentScope(state.pinnedTabs, sid, cur)
            : { scope: cur, pinnedTabs: state.pinnedTabs };
          const existing = tree.findTab(base.scope.layout, (t) => t.type === type);
          const layout = withPinnedLeading(
            base.pinnedTabs,
            sid,
            existing
              ? tree.setActiveTab(base.scope.layout, existing.tile.id, existing.tab.id)
              : tree.addTab(base.scope.layout, tree.firstTile(base.scope.layout).id, type),
          );
          set({
            pinnedTabs: base.pinnedTabs,
            windows: {
              ...state.windows,
              [windowId]: {
                ...win,
                contentByScope: {
                  ...win.contentByScope,
                  [sid]: { ...base.scope, layout, open: true, cleared: false },
                },
              },
            },
          });
        },

        moveTab: (sourceTileId, tabId, targetTileId, zone, index) => {
          const state = get();
          const src = locate(state, sourceTileId);
          const tgt = locate(state, targetTileId);
          if (!src || !tgt) return;
          const srcLayout = layoutAt(state, src);
          const movingTab = tree
            .findTile(srcLayout, sourceTileId)
            ?.tabs.find((t) => t.id === tabId);
          // Placement policy (mirrors the drag layer): a tab may only land in a
          // pane it's allowed in.
          if (!movingTab || !canDropInPane(movingTab.type, tgt.pane)) return;
          // Same container: the single-tree transform preserves self-drop nuance.
          if (
            src.windowId === tgt.windowId &&
            src.pane === tgt.pane &&
            src.scopeId === tgt.scopeId
          ) {
            mutateNodeLayout(sourceTileId, (l) =>
              tree.moveTab(
                l,
                sourceTileId,
                tabId,
                targetTileId,
                zone,
                src.pane === "chat" ? chatMirror : undefined,
                index,
              ),
            );
            return;
          }
          const srcWin = state.windows[src.windowId];
          const tgtWin = state.windows[tgt.windowId];
          const srcTile = tree.findTile(srcLayout, sourceTileId);
          const { root: reducedSrc, tab } = tree.detachTab(srcLayout, sourceTileId, tabId);
          if (!tab) return;

          // 1. Insert into the target container (chat tree or content scope).
          // A chat drop also activates the moved agent in the target window.
          let windows = state.windows;
          if (tgt.pane === "chat") {
            const chatLayout = tree.insertTabIntoTile(
              tgtWin.chatLayout,
              targetTileId,
              tab,
              zone,
              srcTile ?? undefined,
              index,
            );
            const agent = tab.agentId ? state.agents[tab.agentId] : undefined;
            const base = { ...tgtWin, chatLayout, chatCollapsed: false };
            windows = {
              ...windows,
              [tgt.windowId]: agent ? withActiveAgent(base, agent) : base,
            };
          } else {
            const tgtScopeId = tgt.scopeId ?? "";
            const tgtScope = tgtWin.contentByScope[tgtScopeId] ?? defaultScope();
            const layout = withPinnedLeading(
              state.pinnedTabs,
              tgtScopeId,
              tree.insertTabIntoTile(
                tgtScope.layout,
                targetTileId,
                tab,
                zone,
                srcTile ?? undefined,
                index,
              ),
            );
            windows = {
              ...windows,
              [tgt.windowId]: {
                ...tgtWin,
                contentByScope: {
                  ...tgtWin.contentByScope,
                  [tgtScopeId]: { ...tgtScope, layout, open: true },
                },
              },
            };
          }

          // 2. Reduce the source against the post-insert state so both windows
          // commit atomically (a content source may close if it emptied; a chat
          // source reseeds + collapses instead).
          const srcAfter = windows[src.windowId] ?? srcWin;
          if (src.pane === "chat") {
            windows = {
              ...windows,
              [src.windowId]: syncActiveAgent(
                state.agents,
                reduceChat(state.agents, srcAfter, reducedSrc),
              ),
            };
            set({ windows });
            return;
          }
          const reducedSrcWin = reduceWindow(srcAfter, src.scopeId ?? "", reducedSrc);
          set(commitWindow({ windows, windowOrder: state.windowOrder }, src.windowId, reducedSrcWin));
        },

        moveTabToRoot: (sourceTileId, tabId, targetWindowId, targetScopeId, side) => {
          const state = get();
          const src = locate(state, sourceTileId);
          // Content-root drops are content-pane only (the drag layer enforces
          // the same policy; this is the store-boundary guard).
          if (!src || src.pane !== "content") return;
          const srcScopeId = src.scopeId ?? "";
          if (src.windowId === targetWindowId && srcScopeId === targetScopeId) {
            mutateNodeLayout(sourceTileId, (l) => tree.moveTabToRoot(l, sourceTileId, tabId, side));
            return;
          }
          const srcWin = state.windows[src.windowId];
          const tgtWin = state.windows[targetWindowId];
          if (!tgtWin) return;
          const srcScope = srcWin.contentByScope[srcScopeId];
          const tgtScope = tgtWin.contentByScope[targetScopeId] ?? defaultScope();
          const srcTile = tree.findTile(srcScope.layout, sourceTileId);
          const { root: reducedSrc, tab } = tree.detachTab(srcScope.layout, sourceTileId, tabId);
          if (!tab) return;
          const newTgtLayout = withPinnedLeading(
            state.pinnedTabs,
            targetScopeId,
            tree.insertTabAtRoot(tgtScope.layout, tab, side, srcTile ?? undefined),
          );
          const afterTgt = {
            ...state,
            windows: {
              ...state.windows,
              [targetWindowId]: {
                ...tgtWin,
                contentByScope: {
                  ...tgtWin.contentByScope,
                  [targetScopeId]: { ...tgtScope, layout: newTgtLayout, open: true },
                },
              },
            },
          };
          const reducedSrcWin = reduceWindow(afterTgt.windows[src.windowId], srcScopeId, reducedSrc);
          set(commitWindow(afterTgt, src.windowId, reducedSrcWin));
        },

        moveTabToChatRoot: (sourceTileId, tabId, targetWindowId, side) => {
          const state = get();
          const src = locate(state, sourceTileId);
          // Chat-root drops are chat-pane only (policy guard, mirroring the drag layer).
          if (!src || src.pane !== "chat") return;
          if (src.windowId === targetWindowId) {
            mutateNodeLayout(sourceTileId, (l) =>
              tree.moveTabToRoot(l, sourceTileId, tabId, side, chatMirror),
            );
            return;
          }
          const srcWin = state.windows[src.windowId];
          const tgtWin = state.windows[targetWindowId];
          if (!tgtWin) return;
          const srcTile = tree.findTile(srcWin.chatLayout, sourceTileId);
          const { root: reducedSrc, tab } = tree.detachTab(srcWin.chatLayout, sourceTileId, tabId);
          if (!tab) return;
          const agent = tab.agentId ? state.agents[tab.agentId] : undefined;
          const inserted = {
            ...tgtWin,
            chatLayout: tree.insertTabAtRoot(tgtWin.chatLayout, tab, side, srcTile ?? undefined),
            chatCollapsed: false,
          };
          let windows = {
            ...state.windows,
            [targetWindowId]: agent ? withActiveAgent(inserted, agent) : inserted,
          };
          const srcAfter = windows[src.windowId];
          windows = {
            ...windows,
            [src.windowId]: syncActiveAgent(
              state.agents,
              reduceChat(state.agents, srcAfter, reducedSrc),
            ),
          };
          set({ windows });
        },

        openContentWithTab: (sourceTileId, tabId, targetWindowId, targetScopeId) => {
          const state = get();
          const src = locate(state, sourceTileId);
          const tgtWin = state.windows[targetWindowId];
          // The target is a content pane, so only content tabs may land here.
          if (!src || src.pane !== "content" || !tgtWin) return;
          const srcScope = state.windows[src.windowId].contentByScope[src.scopeId ?? ""];
          if (!srcScope) return;
          const tgtScope = tgtWin.contentByScope[targetScopeId] ?? defaultScope();
          const srcTile = tree.findTile(srcScope.layout, sourceTileId);
          const { root: reducedSrc, tab } = tree.detachTab(srcScope.layout, sourceTileId, tabId);
          if (!tab) return;
          // Append into the target panel's first tile and open the pane.
          const landing = tree.firstTile(tgtScope.layout);
          const newTgtLayout = withPinnedLeading(
            state.pinnedTabs,
            targetScopeId,
            tree.insertTabIntoTile(tgtScope.layout, landing.id, tab, "tab", srcTile ?? undefined),
          );
          const afterTgt = {
            ...state,
            windows: {
              ...state.windows,
              [targetWindowId]: {
                ...tgtWin,
                contentByScope: {
                  ...tgtWin.contentByScope,
                  [targetScopeId]: { ...tgtScope, layout: newTgtLayout, open: true },
                },
              },
            },
          };
          const reducedSrcWin = reduceWindow(
            afterTgt.windows[src.windowId],
            src.scopeId ?? "",
            reducedSrc,
          );
          set(commitWindow(afterTgt, src.windowId, reducedSrcWin));
        },

        openTabInNewWindow: (tileId, tabId, geo) => {
          const state = get();
          const src = locate(state, tileId);
          if (!src) return;
          const srcWin = state.windows[src.windowId];
          // Chat tear-off: the moved agent becomes the new window's active agent.
          if (src.pane === "chat") {
            const srcTile = tree.findTile(srcWin.chatLayout, tileId);
            const { root: reducedSrc, tab } = tree.detachTab(srcWin.chatLayout, tileId, tabId);
            if (!tab) return;
            spawnChatWindow(
              src.windowId,
              reducedSrc,
              tree.spawnTileFrom(tab, srcTile ?? undefined),
              tab.agentId,
              geo,
            );
            return;
          }
          const srcScope = srcWin.contentByScope[src.scopeId ?? ""];
          if (!srcScope) return;
          const srcTile = tree.findTile(srcScope.layout, tileId);
          const { root: reducedSrc, tab } = tree.detachTab(srcScope.layout, tileId, tabId);
          if (!tab) return;
          spawnWindow(
            src.windowId,
            src.scopeId ?? "",
            reducedSrc,
            tree.spawnTileFrom(tab, srcTile ?? undefined),
            geo,
          );
        },
        openTileInNewWindow: (tileId, geo) => {
          const state = get();
          const src = locate(state, tileId);
          if (!src) return;
          const srcWin = state.windows[src.windowId];
          if (src.pane === "chat") {
            const tile = tree.findTile(srcWin.chatLayout, tileId);
            if (!tile) return;
            const active = tile.tabs.find((t) => t.id === tile.activeTabId);
            spawnChatWindow(
              src.windowId,
              tree.closeTile(srcWin.chatLayout, tileId),
              tile,
              active?.agentId,
              geo,
            );
            return;
          }
          const srcScope = srcWin.contentByScope[src.scopeId ?? ""];
          if (!srcScope) return;
          const tile = tree.findTile(srcScope.layout, tileId);
          if (!tile) return;
          spawnWindow(
            src.windowId,
            src.scopeId ?? "",
            tree.closeTile(srcScope.layout, tileId),
            tile,
            geo,
          );
        },
        openWorkspaceInNewWindow: (workspaceId, geo) => {
          const state = get();
          // Active agent = first agent in the workspace; fall back to any agent so
          // the window always has a valid content scope.
          const agentId =
            state.agentOrder.find((id) => state.agents[id]?.workspaceId === workspaceId) ??
            state.agentOrder[0];
          const agent = agentId ? state.agents[agentId] : undefined;
          const scopeId = agent ? contentScopeId(agent) : "agent:none";
          const winId = tree.uid("win");
          const newWin: WindowState = {
            id: winId,
            activeAgentId: agentId ?? "",
            sidebarCollapsed: false,
            chatCollapsed: false,
            workspaceScope: workspaceId,
            collapsedWorkspaces: {},
            contentByScope: { [scopeId]: seededScope(state.pinnedTabs, scopeId) },
            chatLayout: defaultChatLayout(agent),
            geo,
          };
          set({
            windows: { ...state.windows, [winId]: newWin },
            windowOrder: [...state.windowOrder, winId],
          });
        },
        setWindowGeo: (id, geo) => {
          const win = get().windows[id];
          if (win) patchWindow(id, { geo });
        },
        focusWindow: (id) => {
          const { windows, windowOrder } = get();
          if (!windows[id]) return;
          if (windowOrder[windowOrder.length - 1] === id) return;
          set({ windowOrder: [...windowOrder.filter((w) => w !== id), id] });
        },
        closeWindow: (id) => {
          const state = get();
          if (!state.windows[id]) return;
          set(commitWindow(state, id, null));
        },
        restoreMainWindow: () => {
          const state = get();
          if (state.windows[MAIN_WINDOW_ID]) return;
          const agentId = state.agentOrder[0] ?? "";
          const agent = state.agents[agentId];
          const scopeId = agent ? contentScopeId(agent) : "agent:none";
          const win: WindowState = {
            id: MAIN_WINDOW_ID,
            activeAgentId: agentId,
            sidebarCollapsed: false,
            chatCollapsed: false,
            workspaceScope: null,
            collapsedWorkspaces: {},
            contentByScope: { [scopeId]: seededScope(state.pinnedTabs, scopeId) },
            chatLayout: defaultChatLayout(agent),
            geo: null,
          };
          set({
            windows: { ...state.windows, [MAIN_WINDOW_ID]: win },
            windowOrder: [MAIN_WINDOW_ID, ...state.windowOrder],
          });
        },

        reset: () => {
          // Snap the main window to the optically-centered default size so a
          // reset lands in the same frame as the Center screenshot / first load.
          const seed = createSeed();
          const geo = centeredWindowGeo();
          const main = seed.windows[MAIN_WINDOW_ID];
          if (main && geo) {
            seed.windows = {
              ...seed.windows,
              [MAIN_WINDOW_ID]: { ...main, geo },
            };
          }
          set({ ...seed, drafts: {}, composerDoc: {} });
        },
      };
    },
    {
      name: "unification-demo-v5",
      // No versioning/migrations: state still persists and reloads across
      // refreshes, but we don't carry backwards compatibility. To force a clean
      // reset, change `name` (or clear the localStorage entry).
      // One structural guard: a persisted window without a chat tree (written
      // by a build mid-upgrade) is healed with the default single-agent tab
      // rather than crashing the chat pane's renderer.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<WorkspaceData>) };
        const windows = { ...merged.windows };
        for (const [id, win] of Object.entries(windows)) {
          if (!win.chatLayout) {
            windows[id] = {
              ...win,
              chatLayout: defaultChatLayout(merged.agents[win.activeAgentId]),
            };
          }
        }
        return { ...merged, windows };
      },
      partialize: (s): WorkspaceData => {
        const main = s.windows[MAIN_WINDOW_ID];
        return {
          workspaces: s.workspaces,
          workspaceOrder: s.workspaceOrder,
          agents: s.agents,
          agentOrder: s.agentOrder,
          pinnedTabs: s.pinnedTabs,
          // Only the main window persists (detached are ephemeral); if it was
          // closed, persist no windows so reload shows the reset state.
          windows: main ? { [MAIN_WINDOW_ID]: { ...main, geo: null } } : {},
          windowOrder: main ? [MAIN_WINDOW_ID] : [],
        };
      },
    },
  ),
);

// Stable fallback so selectors never return undefined for the active scope.
const FALLBACK_SCOPE: ContentScopeState = defaultScope();

/** The current window's view state (from context). */
export const useWindow = (): WindowState | undefined => {
  const windowId = useWindowId();
  return useWorkspaceStore((s) => s.windows[windowId]);
};

export const useActiveAgent = (): Agent | undefined => {
  const windowId = useWindowId();
  return useWorkspaceStore((s) => {
    const win = s.windows[windowId];
    return win ? s.agents[win.activeAgentId] : undefined;
  });
};

// Name of the window's active scope's workspace; falls back to the agent title
// for a standalone (workspace-less) agent. Used as the root crumb for Files tabs.
export const useActiveWorkspaceName = (): string => {
  const windowId = useWindowId();
  return useWorkspaceStore((s) => {
    const win = s.windows[windowId];
    const agent = win ? s.agents[win.activeAgentId] : undefined;
    if (!agent) return TAB_LABEL.files;
    if (agent.workspaceId) return s.workspaces[agent.workspaceId]?.name ?? TAB_LABEL.files;
    return agent.title;
  });
};

export const useActiveScopeId = (): string => {
  const windowId = useWindowId();
  return useWorkspaceStore((s) => {
    const win = s.windows[windowId];
    return win ? scopeIdOfWindow(s, win) : "agent:none";
  });
};

export const useActiveContent = (): ContentScopeState => {
  const windowId = useWindowId();
  return useWorkspaceStore((s) => {
    const win = s.windows[windowId];
    if (!win) return FALLBACK_SCOPE;
    return win.contentByScope[scopeIdOfWindow(s, win)] ?? FALLBACK_SCOPE;
  });
};

/** Maximize the window's Content pane by collapsing both its sidebar and chat.
 *  `maximized` is true only when both are collapsed; `toggle` flips both at once. */
export function useMaximizeContent(): { maximized: boolean; toggle: () => void } {
  const windowId = useWindowId();
  const win = useWorkspaceStore((s) => s.windows[windowId]);
  const setMaximized = useWorkspaceStore((s) => s.setMaximized);
  const maximized = !!win && win.sidebarCollapsed && win.chatCollapsed;
  return { maximized, toggle: () => setMaximized(windowId, !maximized) };
}

/** Headless workspace-switcher logic for the current window: the scope, the
 *  canonical option list, the selected option, and a setter. UI variants (the
 *  footer popover, a future command palette, etc.) consume this and differ only
 *  in presentation. Mirrors `useMaximizeContent`: window-scoped, no JSX. */
export function useWorkspaceSwitcher(): {
  scope: WorkspaceScope;
  options: WorkspaceOption[];
  selectedOption: WorkspaceOption;
  select: (scope: WorkspaceScope) => void;
} {
  const windowId = useWindowId();
  const scope = useWorkspaceStore((s) => s.windows[windowId]?.workspaceScope ?? null);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const setWorkspaceScope = useWorkspaceStore((s) => s.setWorkspaceScope);
  const options = workspaceOptions(workspaces, workspaceOrder);
  const selectedOption = options.find((o) => o.id === scope) ?? options[0];
  return { scope, options, selectedOption, select: (next) => setWorkspaceScope(windowId, next) };
}
