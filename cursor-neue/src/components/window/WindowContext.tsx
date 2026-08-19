import { createContext, useContext } from "react";

// Identifies which window (a full app shell with its own view state) the current
// subtree belongs to. Every shell component reads this to scope its state and
// actions to its window; the main window is "main". Provided once per rendered
// WindowFrame in Desktop, so all the shared UI is reused verbatim per window.
const WindowIdContext = createContext<string>("main");

export const WindowProvider = WindowIdContext.Provider;

export const useWindowId = (): string => useContext(WindowIdContext);

// Whether the re-expand cluster (traffic lights + sidebar/agent toggles) should
// surface in the main area's top-left corner. This tracks the sidebar's *live*
// visual collapse, not the persisted flag: while dragging the divider to
// collapse, the panel snaps to width 0 (clipping the sidebar header's lights)
// before the deferred store commit lands, so gating the cluster on the store
// flag alone would leave the lights with no host for the whole drag (they'd
// flash off). Window OR-s the committed flag with the live drag state here.
const SidebarChromeCollapsedContext = createContext<boolean>(false);

export const SidebarChromeCollapsedProvider = SidebarChromeCollapsedContext.Provider;

export const useSidebarChromeCollapsed = (): boolean =>
  useContext(SidebarChromeCollapsedContext);

// Lets the chat (agent) divider's over-drag continue past its own collapse into
// the sidebar's, so one leftward gesture can close both panes. The sidebar's
// imperative panel + geometry live in Window, while the drag originates from the
// chat divider in MainContainer; this window-scoped handle bridges the two.
//   - preview/cancel: live-collapse the sidebar (and undo it) while dragging, so
//     it mirrors the deferred, cancel-on-drag-back semantics of the panes.
//   - commit: persist the collapse on drag-end.
//   - thresholdX: viewport x left of which the still-open sidebar should
//     collapse (its horizontal midpoint); null when there's nothing to chain
//     into (sidebar already collapsed or geometry unavailable).
export type SidebarCollapseChain = {
  preview: () => void;
  cancel: () => void;
  commit: () => void;
  thresholdX: () => number | null;
};

const SidebarCollapseChainContext = createContext<SidebarCollapseChain | null>(null);

export const SidebarCollapseChainProvider = SidebarCollapseChainContext.Provider;

export const useSidebarCollapseChain = (): SidebarCollapseChain | null =>
  useContext(SidebarCollapseChainContext);
