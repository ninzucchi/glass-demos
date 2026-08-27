// Pure, side-effect-free transforms over the Panel -> Tile -> Tab layout tree.
// All functions return a NEW tree (immutable); the store wires them to state.

import type {
  DropZone,
  LayoutNode,
  SplitDirection,
  SplitNode,
  SplitSide,
  Tab,
  TabType,
  TileNode,
} from "@/types";
import {
  pinnedTabsFor,
  sideToDirection,
  TAB_LABEL,
  tileSidebarOpen,
  workspaceIdOfScope,
} from "@/types";

export const uid = (prefix: string): string =>
  `${prefix}_${
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  }`;

export const isTile = (n: LayoutNode): n is TileNode => n.kind === "tile";
export const isSplit = (n: LayoutNode): n is SplitNode => n.kind === "split";

export function makeTab(type: TabType, overrides: Partial<Tab> = {}): Tab {
  return {
    id: uid("tab"),
    type,
    title: TAB_LABEL[type],
    ...overrides,
  };
}

export function makeTile(
  tabs: Tab[],
  sidebarOpenByType?: Partial<Record<TabType, boolean>>,
): TileNode {
  return {
    kind: "tile",
    id: uid("tile"),
    tabs,
    activeTabId: tabs[0]?.id ?? "",
    sidebarOpenByType,
  };
}

/** A new single-tab pane that inherits one type's sidebar state from where the
 *  tab came (a one-time seed; the new tile then owns its state independently). */
function spawnTile(tab: Tab, from: TileNode): TileNode {
  return makeTile([tab], { [tab.type]: tileSidebarOpen(from, tab.type) });
}

/** Single-tab pane, optionally seeding its sidebar state from a source tile. */
export function spawnTileFrom(tab: Tab, from?: TileNode): TileNode {
  return from ? spawnTile(tab, from) : makeTile([tab]);
}

export function makeSplit(
  direction: SplitDirection,
  children: LayoutNode[],
  sizes?: number[],
): SplitNode {
  return {
    kind: "split",
    id: uid("split"),
    direction,
    children,
    sizes: sizes ?? children.map(() => 100 / children.length),
  };
}

/** Remove a tab from a (multi-tab) tile, keeping a valid active selection. */
function dropTab(tile: TileNode, tabId: string): TileNode {
  const idx = tile.tabs.findIndex((t) => t.id === tabId);
  if (idx === -1) return tile;
  const tabs = tile.tabs.filter((t) => t.id !== tabId);
  const activeTabId =
    tile.activeTabId === tabId ? tabs[Math.min(idx, tabs.length - 1)].id : tile.activeTabId;
  return { ...tile, tabs, activeTabId };
}

/** Default content for a freshly created (lazy) workspace scope. */
export const makeDefaultLayout = (): LayoutNode => makeTile([makeTab("files")]);

/** Default content for a project agent: one Project tab, no workspace pins. */
export const makeProjectLayout = (): LayoutNode => makeTile([makeTab("project")]);

export function findTile(node: LayoutNode, tileId: string): TileNode | null {
  if (isTile(node)) return node.id === tileId ? node : null;
  for (const child of node.children) {
    const found = findTile(child, tileId);
    if (found) return found;
  }
  return null;
}

/** True if a tile OR split with this id exists anywhere in the tree. Used to
 *  resolve which content scope owns a node id (tile ids and split ids are both
 *  globally unique), so layout actions never need a scope passed in. */
export function hasNode(node: LayoutNode, id: string): boolean {
  if (node.id === id) return true;
  if (isTile(node)) return false;
  return node.children.some((c) => hasNode(c, id));
}

/** The first (top-left) tile in a layout. Used as the default landing tile when
 *  appending a tab to a panel with no explicit per-tile target (e.g. dropping
 *  onto a window whose content pane is closed). */
export function firstTile(node: LayoutNode): TileNode {
  return isTile(node) ? node : firstTile(node.children[0]);
}

/** The first tile + tab matching `match` anywhere in the tree (e.g. the chat
 *  tab bound to an agent), or null. */
export function findTab(
  node: LayoutNode,
  match: (tab: Tab) => boolean,
): { tile: TileNode; tab: Tab } | null {
  if (isTile(node)) {
    const tab = node.tabs.find(match);
    return tab ? { tile: node, tab } : null;
  }
  for (const child of node.children) {
    const found = findTab(child, match);
    if (found) return found;
  }
  return null;
}

/** Every tile+tab pair in tree order (left-to-right, top-to-bottom). */
export function allTabs(node: LayoutNode): { tile: TileNode; tab: Tab }[] {
  if (isTile(node)) return node.tabs.map((tab) => ({ tile: node, tab }));
  return node.children.flatMap(allTabs);
}

/** Prepend tabs to a tile's strip without changing its active selection. */
export function prependTabs(root: LayoutNode, tileId: string, tabs: Tab[]): LayoutNode {
  if (tabs.length === 0) return root;
  return mapTile(root, tileId, (t) => ({ ...t, tabs: [...tabs, ...t.tabs] }));
}

/** The scope's PINNED TABS: one per pinned type — the first tab of that type
 *  in tree order (the tab the island's pinned row stands in for). Further tabs
 *  of a pinned type are ordinary tabs. */
export function pinnedTabIds(
  pinnedTabs: Record<string, TabType[]>,
  scopeId: string,
  root: LayoutNode,
): Set<string> {
  const ids = new Set<string>();
  const workspaceId = workspaceIdOfScope(scopeId);
  if (!workspaceId) return ids;
  const pinnedSet = pinnedTabsFor(pinnedTabs, workspaceId);
  const seen = new Set<TabType>();
  for (const { tab } of allTabs(root)) {
    if (pinnedSet.includes(tab.type) && !seen.has(tab.type)) {
      seen.add(tab.type);
      ids.add(tab.id);
    }
  }
  return ids;
}

/** Materialize a workspace's pinned set as REAL tabs: create any missing
 *  pinned-type tab in the first tile, then keep the pinned tabs (see
 *  `pinnedTabIds`) at the leading edge of their strips (a stable partition, so
 *  drag-reorders that would place a plain tab ahead of a pinned one snap
 *  back). Standalone-agent scopes have no pinned set and pass through. */
export function ensurePinnedTabs(
  pinnedTabs: Record<string, TabType[]>,
  scopeId: string,
  root: LayoutNode,
): LayoutNode {
  const workspaceId = workspaceIdOfScope(scopeId);
  if (!workspaceId) return root;
  const pinnedSet = pinnedTabsFor(pinnedTabs, workspaceId);
  const present = new Set(allTabs(root).map(({ tab }) => tab.type));
  const missing = pinnedSet.filter((t) => !present.has(t));
  const seeded = missing.length
    ? prependTabs(root, firstTile(root).id, missing.map((t) => makeTab(t)))
    : root;
  const ids = pinnedTabIds(pinnedTabs, scopeId, seeded);
  return ids.size === 0 ? seeded : partitionTabs(seeded, (t) => ids.has(t.id));
}

/** Stable-partition every tile's tabs so those matching `lead` sit at the
 *  strip's leading edge (relative order preserved on both sides). Returns the
 *  same references for untouched nodes so no-op passes are cheap to detect. */
export function partitionTabs(node: LayoutNode, lead: (tab: Tab) => boolean): LayoutNode {
  if (isTile(node)) {
    const leading = node.tabs.filter(lead);
    if (leading.length === 0 || leading.length === node.tabs.length) return node;
    const tabs = [...leading, ...node.tabs.filter((t) => !lead(t))];
    return tabs.every((t, i) => t === node.tabs[i]) ? node : { ...node, tabs };
  }
  const children = node.children.map((c) => partitionTabs(c, lead));
  return children.every((c, i) => c === node.children[i]) ? node : { ...node, children };
}

/** Drop every tab failing `keep`, removing emptied tiles and collapsing splits.
 *  Returns null if the whole tree emptied (caller substitutes a default). */
export function filterTabs(node: LayoutNode, keep: (tab: Tab) => boolean): LayoutNode | null {
  if (isTile(node)) {
    const tabs = node.tabs.filter(keep);
    if (tabs.length === 0) return null;
    if (tabs.length === node.tabs.length) return node;
    const activeTabId = tabs.some((t) => t.id === node.activeTabId)
      ? node.activeTabId
      : tabs[tabs.length - 1].id;
    return { ...node, tabs, activeTabId };
  }
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  node.children.forEach((child, i) => {
    const next = filterTabs(child, keep);
    if (next) {
      children.push(next);
      sizes.push(node.sizes[i] ?? 100 / node.children.length);
    }
  });
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  const total = sizes.reduce((a, b) => a + b, 0) || 1;
  return { ...node, children, sizes: sizes.map((s) => (s / total) * 100) };
}

/** Replace the tile matching `tileId` with the node returned by `fn`. */
function mapTile(
  node: LayoutNode,
  tileId: string,
  fn: (tile: TileNode) => LayoutNode,
): LayoutNode {
  if (isTile(node)) return node.id === tileId ? fn(node) : node;
  return { ...node, children: node.children.map((c) => mapTile(c, tileId, fn)) };
}

/** Remove the tile, collapsing any split that drops to a single child. Returns
 *  null only if the entire tree was removed (caller should substitute a default). */
function removeNode(node: LayoutNode, tileId: string): LayoutNode | null {
  if (isTile(node)) return node.id === tileId ? null : node;

  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  node.children.forEach((child, i) => {
    const next = removeNode(child, tileId);
    if (next) {
      children.push(next);
      sizes.push(node.sizes[i] ?? 100 / node.children.length);
    }
  });

  if (children.length === 0) return null;
  if (children.length === 1) return children[0]; // collapse split

  const total = sizes.reduce((a, b) => a + b, 0) || 1;
  return { ...node, children, sizes: sizes.map((s) => (s / total) * 100) };
}

export function addTab(
  root: LayoutNode,
  tileId: string,
  type: TabType,
  overrides: Partial<Tab> = {},
): LayoutNode {
  return mapTile(root, tileId, (tile) => {
    const tab = makeTab(type, overrides);
    return { ...tile, tabs: [...tile.tabs, tab], activeTabId: tab.id };
  });
}

export function setActiveTab(root: LayoutNode, tileId: string, tabId: string): LayoutNode {
  return mapTile(root, tileId, (tile) =>
    tile.tabs.some((t) => t.id === tabId) ? { ...tile, activeTabId: tabId } : tile,
  );
}

/** Patch a tab's metadata (title/folder/...) in place. Used for in-tab Files
 *  navigation: clicking a file rewrites its tab rather than opening a new one. */
export function updateTab(
  root: LayoutNode,
  tileId: string,
  tabId: string,
  overrides: Partial<Tab>,
): LayoutNode {
  return mapTile(root, tileId, (tile) => ({
    ...tile,
    tabs: tile.tabs.map((t) => (t.id === tabId ? { ...t, ...overrides } : t)),
  }));
}

/** Toggle a type's sidebar for a single tile. */
export function toggleTileSidebar(
  root: LayoutNode,
  tileId: string,
  type: TabType,
): LayoutNode {
  const source = findTile(root, tileId);
  if (!source) return root;
  const open = !tileSidebarOpen(source, type);
  return mapTile(root, tileId, (tile) => ({
    ...tile,
    sidebarOpenByType: { ...tile.sidebarOpenByType, [type]: open },
  }));
}

export function closeOtherTabs(root: LayoutNode, tileId: string, keepId: string): LayoutNode {
  return mapTile(root, tileId, (tile) => {
    const keep = tile.tabs.find((t) => t.id === keepId);
    return keep ? { ...tile, tabs: [keep], activeTabId: keep.id } : tile;
  });
}

/** Close one tab. If it was the last tab in the tile, the tile is removed and
 *  its split collapsed. Returns null if the whole tree emptied. */
export function closeTab(
  root: LayoutNode,
  tileId: string,
  tabId: string,
): LayoutNode | null {
  const tile = findTile(root, tileId);
  if (!tile) return root;
  if (tile.tabs.length <= 1) return removeNode(root, tileId);

  return mapTile(root, tileId, (t) => dropTab(t, tabId));
}

export function closeTile(root: LayoutNode, tileId: string): LayoutNode | null {
  return removeNode(root, tileId);
}

/** Replace a tile with a split of [tile, clonedTile]; the new tile duplicates
 *  the source tile's active tab (with fresh ids). */
export function splitTile(
  root: LayoutNode,
  tileId: string,
  direction: SplitDirection,
): LayoutNode {
  return mapTile(root, tileId, (tile) => {
    const active = tile.tabs.find((t) => t.id === tile.activeTabId) ?? tile.tabs[0];
    const clonedTab = active
      ? makeTab(active.type, {
          title: active.title,
          folder: active.folder,
          // A chat tab's clone mirrors the same agent's conversation.
          agentId: active.agentId,
        })
      : makeTab("files");
    return makeSplit(direction, [tile, spawnTile(clonedTab, tile)]);
  });
}

/** Remove a tab from its tile so it can be re-homed in another tile or scope.
 *  Returns the reduced tree (null if the tile was the whole tree and emptied)
 *  and the detached tab. Unlike `moveTab`'s self-drop case, this never backfills:
 *  the tab is always finding a home elsewhere, so an emptied source collapses. */
export function detachTab(
  root: LayoutNode,
  tileId: string,
  tabId: string,
): { root: LayoutNode | null; tab: Tab | null } {
  const tile = findTile(root, tileId);
  const tab = tile?.tabs.find((t) => t.id === tabId) ?? null;
  if (!tile || !tab) return { root, tab: null };
  if (tile.tabs.length > 1) return { root: mapTile(root, tileId, (t) => dropTab(t, tabId)), tab };
  return { root: removeNode(root, tileId), tab };
}

/** Drop a tab onto a target tile: merge into its tab bar (`zone === "tab"`,
 *  at `index` or appended) or split it (`right`/`down`), seeding the new
 *  pane's sidebar from `seedFrom`. */
export function insertTabIntoTile(
  root: LayoutNode,
  tileId: string,
  tab: Tab,
  zone: DropZone,
  seedFrom?: TileNode,
  index?: number,
): LayoutNode {
  if (zone === "tab") {
    return mapTile(root, tileId, (t) => {
      const tabs = [...t.tabs];
      tabs.splice(index === undefined ? tabs.length : Math.min(index, tabs.length), 0, tab);
      return { ...t, tabs, activeTabId: tab.id };
    });
  }
  return mapTile(root, tileId, (tile) =>
    makeSplit(sideToDirection(zone), [tile, spawnTileFrom(tab, seedFrom)]),
  );
}

/** Wrap the whole tree in a split so the dropped tab gets a full-span pane. */
export function insertTabAtRoot(
  root: LayoutNode,
  tab: Tab,
  side: SplitSide,
  seedFrom?: TileNode,
): LayoutNode {
  return makeSplit(sideToDirection(side), [root, spawnTileFrom(tab, seedFrom)]);
}

/** Default backfill for a pane emptied by a self-split: a fresh Files tab (the
 *  content pane's default). The chat pane passes a mirror clone of the moving
 *  tab instead. */
const defaultFallback = (): Tab => makeTab("files");

/** Move a tab onto a target tile. `zone === "tab"` merges it into the target's
 *  tab bar (at `index` when given, else appended); `"right"`/`"down"` split the
 *  target and drop it into the new pane.
 *
 *  Source handling:
 *   - multi-tab source: just loses the tab.
 *   - single-tab source split onto ITSELF: the pane is kept and backfilled with
 *     `makeFallback(movingTab)` (the moved tab goes to the new pane) — a
 *     deliberate dupe.
 *   - single-tab source moved to a DIFFERENT tile: the now-empty pane collapses,
 *     since the tab found a home elsewhere (no dupe needed). */
export function moveTab(
  root: LayoutNode,
  sourceTileId: string,
  tabId: string,
  targetTileId: string,
  zone: DropZone,
  makeFallback: (moving: Tab) => Tab = defaultFallback,
  index?: number,
): LayoutNode {
  const sourceTile = findTile(root, sourceTileId);
  const movingTab = sourceTile?.tabs.find((t) => t.id === tabId);
  if (!sourceTile || !movingTab) return root;
  if (!findTile(root, targetTileId)) return root;

  // A tab-zone drop on the tab's own bar is a reorder (or, with no slot, a no-op).
  if (zone === "tab" && sourceTileId === targetTileId) {
    if (index === undefined) return root;
    return mapTile(root, sourceTileId, (t) => {
      const from = t.tabs.findIndex((tb) => tb.id === tabId);
      const to = index > from ? index - 1 : index; // slot indices assume the tab still in place
      if (from === -1 || to === from) return t;
      const tabs = [...t.tabs];
      const [moved] = tabs.splice(from, 1);
      tabs.splice(to, 0, moved);
      return { ...t, tabs, activeTabId: moved.id };
    });
  }

  const lastTab = sourceTile.tabs.length <= 1;
  // A self-drop here is always a split (the self "tab" merge returned above):
  // the only tab is being split off its own pane.
  const selfSplit = sourceTileId === targetTileId;

  // 1. Detach the tab from its source tile.
  let detached: LayoutNode | null;
  if (!lastTab) {
    // Other tabs remain: drop this one and fix the active selection.
    detached = mapTile(root, sourceTileId, (t) => dropTab(t, tabId));
  } else if (selfSplit) {
    // Splitting the only tab off its own pane: keep the pane and backfill it
    // so the original space isn't left empty (the moved tab lands in the new
    // split pane).
    detached = mapTile(root, sourceTileId, (t) => {
      const fallback = makeFallback(movingTab);
      return { ...t, tabs: [fallback], activeTabId: fallback.id };
    });
  } else {
    // The only tab is moving to a different tile that already gives it a home,
    // so let the now-empty source pane collapse instead of backfilling it.
    detached = removeNode(root, sourceTileId);
  }
  if (!detached) return root;

  // 2. Drop into the target: merge into its tab bar, or split it.
  return insertTabIntoTile(detached, targetTileId, movingTab, zone, sourceTile, index);
}

/** Move a tab onto the layout ROOT's outer edge, wrapping the entire tree in a
 *  new split so the dropped tab gets a pane that spans the full width/height
 *  (e.g. a bottom row underneath a side-by-side split). The new pane is always
 *  the trailing child (right column / bottom row), matching `splitTile`.
 *
 *  Source handling mirrors `moveTab`:
 *   - multi-tab source: just loses the tab.
 *   - the tab is the source's only one AND the source is the whole tree: keep the
 *     pane and backfill `makeFallback(movingTab)` (deliberate dupe), since
 *     collapsing it would leave nothing to span.
 *   - otherwise the now-empty source collapses; the tab finds its home in the new
 *     full-span pane. */
export function moveTabToRoot(
  root: LayoutNode,
  sourceTileId: string,
  tabId: string,
  side: SplitSide,
  makeFallback: (moving: Tab) => Tab = defaultFallback,
): LayoutNode {
  const sourceTile = findTile(root, sourceTileId);
  const movingTab = sourceTile?.tabs.find((t) => t.id === tabId);
  if (!sourceTile || !movingTab) return root;

  const lastTab = sourceTile.tabs.length <= 1;
  const sourceIsWholeTree = isTile(root) && root.id === sourceTileId;

  let detached: LayoutNode | null;
  if (!lastTab) {
    detached = mapTile(root, sourceTileId, (t) => dropTab(t, tabId));
  } else if (sourceIsWholeTree) {
    const fallback = makeFallback(movingTab);
    detached = { ...sourceTile, tabs: [fallback], activeTabId: fallback.id };
  } else {
    detached = removeNode(root, sourceTileId);
  }
  if (!detached) return root;

  return insertTabAtRoot(detached, movingTab, side, sourceTile);
}

export function setSizes(root: LayoutNode, splitId: string, sizes: number[]): LayoutNode {
  if (isTile(root)) return root;
  const self =
    root.id === splitId && sizes.length === root.children.length
      ? { ...root, sizes }
      : root;
  return { ...self, children: self.children.map((c) => setSizes(c, splitId, sizes)) };
}
