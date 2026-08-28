import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Panel, PanelGroup, type ImperativePanelHandle } from "react-resizable-panels";
import clsx from "clsx";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { PinnedIsland } from "@/components/sidebar/PinnedIsland";
import { MainContainer } from "@/components/layout/MainContainer";
import { useTabDragStore } from "@/store/tabDrag";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { ComposerSurface } from "@/components/chat/ComposerSurface";
import { NewProjectDialog } from "@/components/sidebar/NewProjectDialog";
import { CustomizeModal } from "@/components/ui/CustomizeModal";
import { useDeferredPaneCollapse } from "@/components/layout/useDeferredPaneCollapse";
import { useCrumbMouseNav } from "@/components/window/useCrumbMouseNav";
import {
  SidebarChromeCollapsedProvider,
  SidebarCollapseChainProvider,
  useWindowId,
  type SidebarCollapseChain,
} from "@/components/window/WindowContext";
import {
  useActiveContent,
  useMaximizeContent,
  useWindow,
  useWorkspaceStore,
} from "@/store/useWorkspaceStore";
import { DEFAULT_W } from "@/components/desktop/geometry";

// react-resizable-panels sizes in percentages, but the sidebar's usable floor is a
// fixed pixel width (where the header controls sit flush to the edge). We derive the
// % min from the live window width so the floor lands at the same pixel in any window.
const SIDEBAR_MIN_PX = 168;
const SIDEBAR_DEFAULT_PX = 280;
const SIDEBAR_MAX_PCT = 32;

// The pinned/open island collapses to its icon-only rail when the full-width
// island wouldn't sit clear of the centered chat column it floats above:
// right gutter = (main pane width - chat column) / 2.
const CHAT_COLUMN_MAX_PX = 640; // matches the chat body/composer max-w
const ISLAND_FULL_PX = 200 + 16; // island width + right offset (8) + gap (8)
const ISLAND_COMPACT_PX = 36 + 16; // icon rail width + right offset (8) + gap (8)
const CHAT_COLUMN_PAD_PX = 12; // the column's own px-3

// No separate title bar: window controls are integrated into the column headers
// (traffic lights in the sidebar top, panel toggle inline in the top-right tab toolbar).
export function Window() {
  const windowId = useWindowId();
  useCrumbMouseNav();
  const win = useWindow();
  const collapsed = win?.sidebarCollapsed ?? false;
  // When the chat (agent) is hidden, Content fills the main area and the sidebar
  // divider becomes Content's left border — so it's the one that should carry the
  // maximize double-click (the chat|content divider that normally hosts it is
  // gone). `toggle` flips the shared maximize (collapse both / restore both).
  const chatCollapsed = win?.chatCollapsed ?? false;
  const windowW = win?.geo?.w ?? DEFAULT_W;
  const sidebarDefaultPct = Math.min((SIDEBAR_DEFAULT_PX / windowW) * 100, SIDEBAR_MAX_PCT);
  const { toggle: toggleMaximize } = useMaximizeContent();
  const setSidebarCollapsed = useWorkspaceStore((s) => s.setSidebarCollapsed);
  // Over-dragging the divider past the sidebar's min snaps it to 0 (live
  // preview); the collapse only commits on drag-end (shared hook), so dragging
  // back out before release cancels it — matching the chat pane.
  const sidebarCollapse = useDeferredPaneCollapse(() => setSidebarCollapsed(windowId, true));
  // Live visual collapse, flipped the instant the panel snaps to/from 0 — ahead
  // of the deferred store commit. The re-expand cluster reads this (OR the
  // committed flag) so the traffic lights never lose their host mid-drag.
  const [visuallyCollapsed, setVisuallyCollapsed] = useState(collapsed);
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  // Last chosen sidebar width in pixels (default or user drag). The panel API
  // stores %, so a window scale would otherwise stretch the sidebar; we re-apply
  // this px as a % whenever the shell width changes.
  const sidebarPxRef = useRef(SIDEBAR_DEFAULT_PX);
  const applyingSidebarPx = useRef(false);
  const userResizingSidebar = useRef(false);
  // Pixel floor expressed as a % of the current window width, recomputed as the
  // window resizes so the sidebar's collapse threshold lands at the same pixel
  // width in every window regardless of its overall size.
  const [minSize, setMinSize] = useState(14);

  const applySidebarPx = (windowW: number) => {
    const panel = sidebarRef.current;
    if (!panel || panel.isCollapsed() || windowW <= 0) return;
    applyingSidebarPx.current = true;
    panel.resize(Math.min((sidebarPxRef.current / windowW) * 100, SIDEBAR_MAX_PCT));
    applyingSidebarPx.current = false;
  };

  // The store flag is the single source of truth; keep the imperative panel in
  // sync with it. Must run pre-paint (useLayoutEffect): the chat panel reads
  // `collapsed` synchronously while the sidebar width only changes via
  // collapse()/expand() here, so a post-paint sync leaves a one-frame mismatch
  // that flashes the traffic lights when toggling fast.
  useLayoutEffect(() => {
    const panel = sidebarRef.current;
    if (!panel) return;
    if (collapsed && !panel.isCollapsed()) panel.collapse();
    else if (!collapsed && panel.isCollapsed()) {
      panel.expand();
      applySidebarPx(shellRef.current?.clientWidth ?? 0);
    }
  }, [collapsed]);

  // Bridge for the chat (agent) divider's over-drag: it lives in MainContainer
  // but, once the chat has closed, a continued leftward drag should also close
  // the sidebar in the same gesture. We own the sidebar's imperative handle and
  // geometry, so we expose them here for that drag to drive (live preview +
  // cancel-on-drag-back + deferred commit, matching the panes' own collapse).
  // preview()/cancel() go through the panel's collapse()/expand(), so the
  // onCollapse/onExpand handlers above keep `visuallyCollapsed` and the deferred
  // commit ref in sync just as a direct sidebar drag would.
  const collapseChain = useMemo<SidebarCollapseChain>(
    () => ({
      preview: () => {
        const panel = sidebarRef.current;
        if (panel && !panel.isCollapsed()) panel.collapse();
      },
      cancel: () => {
        const panel = sidebarRef.current;
        if (panel && panel.isCollapsed()) panel.expand();
      },
      commit: () => setSidebarCollapsed(windowId, true),
      thresholdX: () => {
        const shell = shellRef.current;
        const panel = sidebarRef.current;
        if (!shell || !panel || panel.isCollapsed()) return null;
        const rect = shell.getBoundingClientRect();
        const sidebarPx = (panel.getSize() / 100) * rect.width;
        // Sidebar's horizontal midpoint: drag the cursor past it to collapse.
        return rect.left + sidebarPx / 2;
      },
    }),
    [windowId, setSidebarCollapsed],
  );

  // Drop the island's pointer events mid tab-drag so drops hit-test through to
  // the tiles beneath it (same treatment as MainContainer's maximize edge).
  const dragging = useTabDragStore((s) => s.source !== null);

  // Collapse the island to its icon rail when the main pane is too narrow for
  // the full island to clear the centered chat column. When even the rail
  // would intrude into the column's text, reserve that overlap as extra right
  // padding on the chat column (via the --island-inset var below), so island
  // and messages always keep a gap instead of overlapping.
  const mainRef = useRef<HTMLDivElement>(null);
  const [islandCompact, setIslandCompact] = useState(false);
  const [islandInset, setIslandInset] = useState(0);
  const islandVisible = !useActiveContent().open;
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const compact = (w - CHAT_COLUMN_MAX_PX) / 2 < ISLAND_FULL_PX;
      setIslandCompact(compact);
      // Distance from the pane's right edge to the column TEXT's right edge.
      const gutter = Math.max(0, (w - CHAT_COLUMN_MAX_PX) / 2) + CHAT_COLUMN_PAD_PX;
      const footprint = compact ? ISLAND_COMPACT_PX : ISLAND_FULL_PX;
      setIslandInset(Math.max(0, Math.ceil(footprint - gutter)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the sidebar's pixel width stable when the window scales, and keep the
  // % min in lockstep with the live window width. geo.w runs pre-paint; the
  // observer covers first measure and any width change that skips geo.
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setMinSize(Math.min((SIDEBAR_MIN_PX / w) * 100, SIDEBAR_MAX_PCT));
      applySidebarPx(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const w = shellRef.current?.clientWidth ?? 0;
    if (w <= 0) return;
    setMinSize(Math.min((SIDEBAR_MIN_PX / w) * 100, SIDEBAR_MAX_PCT));
    applySidebarPx(w);
  }, [win?.geo?.w]);

  return (
    // Shell stays transparent so the sidebar can blur the desktop wallpaper
    // through; only the main pane carries the opaque chrome fill.
    <SidebarChromeCollapsedProvider value={collapsed || visuallyCollapsed}>
      <SidebarCollapseChainProvider value={collapseChain}>
        <div
          ref={shellRef}
          // Screenshot capture repaints this shadow onto its canvas (see
          // lib/screenshot), and finds the shell by this hook.
          data-window-shell=""
          className="relative h-full w-full overflow-hidden rounded-window shadow-window"
          // Consumed by the chat column's right padding so messages always
          // keep a gap to the floating island (0 while the island is hidden).
          style={{ "--island-inset": islandVisible ? `${islandInset}px` : "0px" } as CSSProperties}
        >
          {/* No autoSaveId: every window's shell has the same panel ids
              ("sidebar"/"main"), so a shared autoSaveId would persist one entry
              that all windows read & write — leaking collapse/size across windows.
              Collapse is the per-window store flag (synced imperatively above);
              sizes stay in-memory per group, keeping each window sandboxed. */}
          <PanelGroup direction="horizontal">
            <Panel
              id="sidebar"
              order={1}
              ref={sidebarRef}
              collapsible
              collapsedSize={0}
              defaultSize={sidebarDefaultPct}
              minSize={minSize}
              maxSize={SIDEBAR_MAX_PCT}
              onCollapse={() => {
                setVisuallyCollapsed(true);
                sidebarCollapse.onCollapse();
              }}
              onExpand={() => {
                setVisuallyCollapsed(false);
                sidebarCollapse.onExpand();
              }}
              onResize={(size) => {
                if (applyingSidebarPx.current || !userResizingSidebar.current) return;
                const w = shellRef.current?.clientWidth ?? 0;
                if (w <= 0 || size <= 0) return;
                sidebarPxRef.current = (size / 100) * w;
              }}
            >
              <Sidebar />
            </Panel>
            {!collapsed && (
              <ResizeHandle
                direction="horizontal"
                onDragging={(isDragging) => {
                  userResizingSidebar.current = isDragging;
                  sidebarCollapse.onDragging(isDragging);
                  if (isDragging) return;
                  const panel = sidebarRef.current;
                  const w = shellRef.current?.clientWidth ?? 0;
                  if (!panel || panel.isCollapsed() || w <= 0) return;
                  const size = panel.getSize();
                  if (size > 0) sidebarPxRef.current = (size / 100) * w;
                }}
                // Only border Content (and thus offer maximize) once the chat is
                // hidden; with the chat shown this divider sits between sidebar and
                // chat, so double-click there shouldn't maximize.
                onDoubleClick={chatCollapsed ? toggleMaximize : undefined}
                hint={chatCollapsed ? "Double-Click to Maximize" : undefined}
              />
            )}
            <Panel id="main" order={2} minSize={40}>
              <div ref={mainRef} className="h-full bg-chrome">
                <MainContainer />
              </div>
            </Panel>
          </PanelGroup>
          {/* Open-tabs + pinned-tab-types island, floated at the window's
              top-right (below the toolbar row) over whichever pane sits there.
              The wrapper stays click-through so only the rows take pointer. */}
          <div
            className={clsx(
              "pointer-events-none absolute right-2 top-11 z-40",
              islandCompact ? "w-auto" : "w-[200px]",
              !dragging && "[&_button]:pointer-events-auto",
            )}
          >
            <PinnedIsland compact={islandCompact} />
          </div>
          {/* Scoped to this window's shell so the scrim is clipped to the window
              (rounded corners + overflow-hidden) rather than the whole desktop. */}
          <CustomizeModal />
          <NewProjectDialog />
          <ComposerSurface />
        </div>
      </SidebarCollapseChainProvider>
    </SidebarChromeCollapsedProvider>
  );
}
