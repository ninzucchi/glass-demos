// Shared pointer-driven drag interaction for the tab/file -> tile drop system.
// Both an existing tab (TabHandle, a MOVE) and a file row in the Files tree
// (FilesSidebar/FilesHome, a CREATE) start a drag the same way: same threshold,
// same drop-target hit-testing, same chip + drop previews. Only what happens on
// release differs, so callers supply the drop source and an `onDrop` commit.
//
// Pointer events (not HTML5 drag-and-drop) match the rest of the app's window /
// resize / tab interactions and stay reliable inside the embedded webview.

import type { PointerEvent as ReactPointerEvent, MutableRefObject } from "react";
import type { DropZone, LayoutNode, PaneKind, SplitSide } from "@/types";
import { canDropInPane } from "@/types";
import { useTabDragStore, type TabDragSource, type TabDropTarget } from "@/store/tabDrag";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import * as tree from "@/store/layoutTree";
import { isOutsideWindows, topElementAt } from "@/components/desktop/geometry";
import { lockDragSelection } from "@/lib/dragGuard";

// Movement (px) before a press becomes a drag, so plain clicks still select/open.
const DRAG_THRESHOLD = 4;
// The cursor must travel at least this far from where the drag began before any
// drop registers; dropping inside this boundary cancels (no split / no move).
const SAFETY_DISTANCE = 44;
// Fraction of the tile's width/height near an edge that splits; the larger
// central area merges the tab into the tile's tab bar. Bottom splits get a
// slightly taller band so the user doesn't have to drag all the way to the
// lower edge before the vertical split affordance appears.
const RIGHT_EDGE_RATIO = 0.28;
const BOTTOM_EDGE_RATIO = 0.34;
// Thin band (px) along the content panel's OUTER edge that splits the whole
// layout root for a full-span pane, instead of just the tile under the cursor.
// Kept narrow so per-tile edge splits stay reachable just inside it.
const ROOT_EDGE_PX = 22;

// Insertion slot in a tab strip for a drop at `x`: before the first tab whose
// horizontal midpoint the cursor hasn't passed, else after the last. The slot
// clamps against the strip's pinned leading group (`data-pinned` handles):
// pinned tabs may not leave it, plain tabs may not enter it. Returns null when
// the (clamped) slot leaves the dragged tab in place (a no-op reorder).
function stripSlot(
  strip: HTMLElement,
  x: number,
  sourceTabId: string,
  sourcePinned: boolean,
): number | null {
  const handles = Array.from(strip.querySelectorAll<HTMLElement>("[data-tab-id]"));
  let index = handles.length;
  for (let i = 0; i < handles.length; i++) {
    const r = handles[i].getBoundingClientRect();
    if (x < r.left + r.width / 2) {
      index = i;
      break;
    }
  }
  // Pinned handles are contiguous at the strip's leading edge (state enforces
  // the partition), so the group boundary is the first non-pinned handle.
  let lead = 0;
  while (lead < handles.length && handles[lead].hasAttribute("data-pinned")) lead++;
  index = sourcePinned ? Math.min(index, lead) : Math.max(index, lead);
  const from = handles.findIndex((h) => h.getAttribute("data-tab-id") === sourceTabId);
  if (from !== -1 && (index === from || index === from + 1)) return null;
  return index;
}

// Whether (x, y) sits in the thin root-split band along an element's outer
// right/bottom edge, and which side wins (nearest edge in the corner).
function rootEdgeSide(el: HTMLElement, x: number, y: number): SplitSide | null {
  const r = el.getBoundingClientRect();
  const dRight = r.right - x;
  const dBottom = r.bottom - y;
  const nearRight = dRight >= 0 && dRight <= ROOT_EDGE_PX;
  const nearBottom = dBottom >= 0 && dBottom <= ROOT_EDGE_PX;
  if (!nearRight && !nearBottom) return null;
  return nearRight && nearBottom ? (dRight <= dBottom ? "right" : "down") : nearRight ? "right" : "down";
}

// Resolve where a drop at (x, y) would land. Every candidate is gated by the
// shared `canDropInPane` placement policy (chat tabs stay in chat panes,
// content tabs in content panes); the mechanics are otherwise pane-agnostic.
// Priority:
//  1. Within a panel's outer right / bottom band -> a full-span split at that
//     panel's layout root (the new pane spans the whole width/height).
//  2. The tile under the cursor (if its pane accepts this tab): right / bottom
//     edge bands split it, the center merges the tab into its tab bar.
//  3. A window whose content pane is closed: opens content and appends the tab.
function targetAtPoint(x: number, y: number, source: TabDragSource): TabDropTarget | null {
  const el = topElementAt(x, y);
  if (!el) return null;

  if (canDropInPane(source.tabType, "content")) {
    const rootEl = el.closest("[data-content-root]") as HTMLElement | null;
    const side = rootEl && rootEdgeSide(rootEl, x, y);
    if (rootEl && side) {
      // A root drop isn't identified by a node id, so read the target window +
      // scope off the content root the cursor is over.
      const windowId = rootEl.getAttribute("data-window-id") ?? "";
      const scopeId = rootEl.getAttribute("data-scope-id") ?? "";
      return { scope: "root", windowId, scopeId, side };
    }
  }

  if (canDropInPane(source.tabType, "chat")) {
    const chatRootEl = el.closest("[data-chat-root]") as HTMLElement | null;
    const side = chatRootEl && rootEdgeSide(chatRootEl, x, y);
    if (chatRootEl && side) {
      // Chat roots are per-window (one chat tree per window, no scope id).
      return { scope: "chat-root", windowId: chatRootEl.getAttribute("data-window-id") ?? "", side };
    }
  }

  // The tile under the cursor, if this tab may land in its pane. A pane
  // mismatch falls through (e.g. a content tab over the chat tiles of a
  // closed-content window still targets that window's "open" drop below).
  const tileEl = el.closest("[data-tile-id]") as HTMLElement | null;
  const tileId = tileEl?.getAttribute("data-tile-id");
  const tilePane = (tileEl?.getAttribute("data-pane") ?? "content") as PaneKind;
  if (tileEl && tileId && canDropInPane(source.tabType, tilePane)) {
    // A MOVE drag directly over the tile's tab strip: a tab-zone drop at a
    // specific slot (reorder within the source tile, or a positioned merge
    // elsewhere). A no-op slot (either side of the dragged tab itself) falls
    // through to the regular tile zones. CREATE drags (no source tab) keep the
    // simpler append-on-merge behavior.
    const stripEl = el.closest("[data-tab-strip]") as HTMLElement | null;
    if (source.tabId && stripEl && tileEl.contains(stripEl)) {
      const index = stripSlot(stripEl, x, source.tabId, !!source.pinnedType);
      if (index !== null) return { scope: "tile", tileId, zone: "tab", index };
    }

    const r = tileEl.getBoundingClientRect();
    const relX = (x - r.left) / Math.max(r.width, 1);
    const relY = (y - r.top) / Math.max(r.height, 1);

    const nearRight = relX >= 1 - RIGHT_EDGE_RATIO;
    const nearBottom = relY >= 1 - BOTTOM_EDGE_RATIO;
    let zone: DropZone = "tab";
    if (nearRight && nearBottom) {
      // In the corner, commit to whichever edge the cursor is closest to.
      zone = 1 - relX <= 1 - relY ? "right" : "down";
    } else if (nearRight) {
      zone = "right";
    } else if (nearBottom) {
      zone = "down";
    }
    return { scope: "tile", tileId, zone };
  }

  // A window whose content pane is closed (chat fills it): no content tiles to
  // target, so the area accepts a content-tab drop that opens content and
  // appends the tab.
  if (canDropInPane(source.tabType, "content")) {
    const closedEl = el.closest("[data-content-closed]") as HTMLElement | null;
    if (closedEl) {
      return {
        scope: "open",
        windowId: closedEl.getAttribute("data-window-id") ?? "",
        scopeId: closedEl.getAttribute("data-scope-id") ?? "",
      };
    }
  }
  return null;
}

// Unlike content tabs (which may be duplicated freely), a chat agent should
// appear at most once in a window's chat layout — a second tab/pane of the same
// conversation is pure redundancy. This rejects any chat drop that would place
// the dragged agent alongside another instance of itself:
//  - merging/splitting into a tile that already holds this agent (in another tab
//    or, for a split, the tile it's leaving), and
//  - splitting the sole chat off its own single-tab pane/panel (a self-mirror).
// Returns true when the drop should be suppressed. Content drags are unaffected.
function duplicatesChat(source: TabDragSource, target: TabDropTarget): boolean {
  if (source.pane !== "chat" || !source.agentId) return false;
  const { agentId, tabId: movingTabId } = source; // movingTabId is "" for a sidebar CREATE drag
  const { windows } = useWorkspaceStore.getState();
  // Another live tab of the same agent, excluding the one being dragged.
  const otherInstance = (chatLayout: LayoutNode): boolean =>
    !!tree.findTab(chatLayout, (t) => t.agentId === agentId && t.id !== movingTabId);

  if (target.scope === "tile") {
    for (const win of Object.values(windows)) {
      const tile = tree.findTile(win.chatLayout, target.tileId);
      if (!tile) continue;
      if (otherInstance(win.chatLayout)) return true;
      const selfSplit = !!movingTabId && target.tileId === source.tileId && target.zone !== "tab";
      return selfSplit && tile.tabs.length === 1;
    }
    return false;
  }

  if (target.scope === "chat-root") {
    const win = windows[target.windowId];
    if (!win) return false;
    if (otherInstance(win.chatLayout)) return true;
    // Dropping the sole chat onto its own panel edge mirrors it against itself.
    return !!movingTabId && tree.isTile(win.chatLayout) && win.chatLayout.tabs.length === 1;
  }

  return false;
}

export interface TabDragConfig {
  /** Build the drag source once movement crosses the threshold (so plain clicks
   *  never begin a drag). The chip + drop logic read its title/icon. */
  createSource: () => TabDragSource;
  /** Re-dropping onto the source tile's own tab bar/center. True for a MOVE
   *  (re-merging a tab into its own bar is a no-op); false for a CREATE (opening
   *  a file as a new tab in its own tile is a real action). */
  suppressSelfTile: boolean;
  /** Set true the moment a real drag begins, so the click that fires on release
   *  can be ignored by the caller (preventing a stray select/open). */
  didDragRef: MutableRefObject<boolean>;
  /** Commit on release. `target` is null when released over no valid target;
   *  consult `pointer` for a tear-off-to-new-window outside drop. */
  onDrop: (
    source: TabDragSource,
    target: TabDropTarget | null,
    pointer: { x: number; y: number },
  ) => void;
}

/** Start a tab/file drag from a primary-button pointerdown. Wires the move/up/
 *  Escape listeners, drives the drag store (chip + drop previews), and calls
 *  `onDrop` on release. Safe to attach directly as an `onPointerDown` handler. */
export function beginTabDrag(e: ReactPointerEvent<HTMLElement>, config: TabDragConfig): void {
  // Middle click is reserved (e.g. close-tab); suppress autoscroll and bail.
  if (e.button === 1) {
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return; // primary button only; keep right-click for menus

  const startX = e.clientX;
  const startY = e.clientY;
  let started = false;
  let dragSource: TabDragSource | null = null;
  let release: (() => void) | null = null;
  const { begin, move, end } = useTabDragStore.getState();

  const onMove = (ev: PointerEvent) => {
    const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
    if (!started) {
      if (dist < DRAG_THRESHOLD) return;
      started = true;
      config.didDragRef.current = true;
      dragSource = config.createSource();
      begin(dragSource, { x: ev.clientX, y: ev.clientY });
      release = lockDragSelection("grabbing");
    }
    if (!dragSource) return;
    // Only surface a drop target when releasing would actually do something:
    // suppress it inside the safety boundary and (for moves) over the source
    // tile's own tab/center zone (re-merging a tab into its own bar is a no-op).
    // A slotted drop on the source tile's own strip is the exception on both
    // counts: it's a reorder, meaningful even right where the drag began.
    let target = targetAtPoint(ev.clientX, ev.clientY, dragSource);
    const reorder =
      target?.scope === "tile" &&
      target.tileId === dragSource.tileId &&
      target.zone === "tab" &&
      target.index !== undefined;
    if (dist < SAFETY_DISTANCE && !reorder) target = null;
    if (
      config.suppressSelfTile &&
      !reorder &&
      target &&
      target.scope === "tile" &&
      target.tileId === dragSource.tileId &&
      target.zone === "tab"
    )
      target = null;
    // A chat may not be split/tabbed against another instance of itself.
    if (target && duplicatesChat(dragSource, target)) target = null;
    // With no in-app target, a release over the desktop tears off a new window.
    const outside = !target && dist >= SAFETY_DISTANCE && isOutsideWindows(ev.clientX, ev.clientY);
    move({ x: ev.clientX, y: ev.clientY }, target, outside);
  };

  const cleanup = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("keydown", onKey);
    release?.();
    release = null;
  };

  const onUp = () => {
    const { source, target, pointer } = useTabDragStore.getState();
    if (started && source) config.onDrop(source, target, pointer);
    cleanup();
    end();
  };

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      cleanup();
      end();
    }
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("keydown", onKey);
}
