// Ephemeral (non-persisted) UI state for the pointer-driven tab drag-to-tile
// interaction. Kept out of the persisted workspace store so a drag in progress
// never leaks into storage. We use pointer events (not HTML5 drag-and-drop)
// because native DnD is unreliable inside the app's embedded webview, and
// pointer dragging matches the window/resize-handle interactions already here.

import { create } from "zustand";
import type { DropZone, PaneKind, SplitSide, TabType } from "@/types";
import type { IconName } from "@/components/ui/Icon";

export interface TabDragSource {
  tileId: string;
  tabId: string;
  title: string;
  icon: IconName;
  /** Which pane the drag started in (chat or content). */
  pane: PaneKind;
  /** The dragged tab's type, checked against `canDropInPane` per target. */
  tabType: TabType;
  /** Set for a sidebar agent-row drag (a CREATE drag with no source tab); lets
   *  the row render its own dragging state. */
  agentId?: string;
  /** Sidebar multi-select: every agent riding this drag. `agentId` is the
   *  grabbed row. Absent means a single-agent drag. */
  agentIds?: string[];
  /** True when the tab's type is pinned in its workspace: strip slots clamp so
   *  it stays inside the pinned leading group (and plain tabs stay out). */
  pinnedType?: boolean;
}

// A drop either lands on a single tile (merge into its tab bar or split it; the
// owning window + pane/scope is resolved from the tile id) or on a panel's
// outer edge, which splits that panel's layout ROOT so the new pane spans the
// full width/height. Root drops carry the target `windowId` (+ `scopeId` for
// content) because, unlike a tile drop, they are not identified by any node id
// (and a scope id alone isn't unique across windows). Chat roots are
// per-window, so `chat-root` needs no scope id.
export type TabDropTarget =
  // `index` (tab-zone drops only) is the insertion slot in the tile's tab
  // strip; when absent the tab appends at the end.
  | { scope: "tile"; tileId: string; zone: DropZone; index?: number }
  | { scope: "root"; windowId: string; scopeId: string; side: SplitSide }
  | { scope: "chat-root"; windowId: string; side: SplitSide }
  // The cursor is over a window whose content pane is closed (chat fills it, so
  // there are no content tiles to target): releasing opens that window's
  // content and appends the tab.
  | { scope: "open"; windowId: string; scopeId: string }
  // Sidebar agent-row CREATE drag: drop on Pinned pins, drop on Chats unpins
  // or lifts a group to the top level, drop on Projects unpins a project, drop
  // on a group folder re-parents an agent or nests a group (two levels max).
  | { scope: "sidebar-section"; section: "pinned" | "chats" | "projects" }
  | { scope: "sidebar-project"; projectId: string };

function sameDropTarget(a: TabDropTarget | null, b: TabDropTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.scope !== b.scope) return false;
  if (a.scope === "tile" && b.scope === "tile")
    return a.tileId === b.tileId && a.zone === b.zone && a.index === b.index;
  if (a.scope === "root" && b.scope === "root")
    return a.side === b.side && a.scopeId === b.scopeId && a.windowId === b.windowId;
  if (a.scope === "chat-root" && b.scope === "chat-root")
    return a.side === b.side && a.windowId === b.windowId;
  if (a.scope === "open" && b.scope === "open")
    return a.windowId === b.windowId && a.scopeId === b.scopeId;
  if (a.scope === "sidebar-section" && b.scope === "sidebar-section")
    return a.section === b.section;
  if (a.scope === "sidebar-project" && b.scope === "sidebar-project")
    return a.projectId === b.projectId;
  return false;
}

interface TabDragState {
  // The tab being dragged, or null when no drag is in progress.
  source: TabDragSource | null;
  // The tile under the cursor and which side a drop would split into.
  target: TabDropTarget | null;
  // True when the cursor is over the desktop (outside every window): releasing
  // there tears the tab off into a new window. Drives the drag chip's hint.
  outside: boolean;
  // Live cursor position, used to position the floating drag chip.
  pointer: { x: number; y: number };
  /** Live insertion slot while reordering a project in the Projects list. */
  listIndex: number | null;
  /** Which sidebar list owns `listIndex`. */
  listScope: "project-order" | "group-folder-order" | null;

  begin: (source: TabDragSource, pointer: { x: number; y: number }) => void;
  move: (pointer: { x: number; y: number }, target: TabDropTarget | null, outside: boolean) => void;
  setListIndex: (
    listIndex: number | null,
    listScope?: "project-order" | "group-folder-order" | null,
  ) => void;
  end: () => void;
}

export const useTabDragStore = create<TabDragState>((set) => ({
  source: null,
  target: null,
  outside: false,
  pointer: { x: 0, y: 0 },
  listIndex: null,
  listScope: null,
  begin: (source, pointer) =>
    set({
      source,
      target: null,
      outside: false,
      pointer,
      listIndex: null,
      listScope: null,
    }),
  move: (pointer, target, outside) =>
    set((s) =>
      // Avoid churning `target`/`outside` (which subscribers read) when only the
      // pointer moved within the same drop region.
      sameDropTarget(s.target, target) && s.outside === outside
        ? { pointer }
        : { pointer, target, outside },
    ),
  setListIndex: (listIndex, listScope) =>
    set((s) => {
      const nextScope = listIndex == null ? null : (listScope ?? s.listScope);
      if (s.listIndex === listIndex && s.listScope === nextScope) return s;
      return { listIndex, listScope: nextScope };
    }),
  end: () =>
    set({
      source: null,
      target: null,
      outside: false,
      listIndex: null,
      listScope: null,
    }),
}));
