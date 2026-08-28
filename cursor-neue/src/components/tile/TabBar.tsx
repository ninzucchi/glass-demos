import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { TileNode } from "@/types";
import { isProjectScope, pinnedTabsFor, workspaceIdOfScope } from "@/types";
import {
  useActiveContent,
  useActiveScopeId,
  useWindow,
  useWorkspaceStore,
} from "@/store/useWorkspaceStore";
import { hasNode } from "@/store/layoutTree";
import { useTabDragStore } from "@/store/tabDrag";
import { newWindowGeo } from "@/components/desktop/geometry";
import { ChatCrumbs } from "@/components/chat/ChatCrumbs";
import { TabHandle } from "@/components/tile/TabHandle";
import { AddTabMenu } from "@/components/tile/AddTabMenu";
import { ProjectAgentsMenu } from "@/components/tile/ProjectAgentsMenu";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { TileContextMenu } from "@/components/tile/TileContextMenu";
import { ChatToggle } from "@/components/chat/ChatToggle";
import { SplitToggle } from "@/components/layout/SplitToggle";
import { SidebarReexpandCluster } from "@/components/sidebar/SidebarControls";
import type { TileVariant } from "@/components/tile/Tile";

const OVERFLOW_MASK =
  "linear-gradient(to right, #000, #000 calc(100% - 20px), transparent)";

/** Accent caret marking where a dragged tab will land in this strip: at slot
 *  `index`'s left edge (or the last tab's right edge for an end drop). */
function InsertionCaret({
  index,
  stripRef,
  isChat,
}: {
  index: number;
  stripRef: RefObject<HTMLDivElement>;
  isChat: boolean;
}) {
  const [left, setLeft] = useState<number | null>(null);
  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const handles = strip.querySelectorAll<HTMLElement>("[data-tab-id]");
    if (handles.length === 0) return;
    const stripLeft = strip.getBoundingClientRect().left - strip.scrollLeft;
    const r =
      index < handles.length
        ? handles[index].getBoundingClientRect()
        : handles[handles.length - 1].getBoundingClientRect();
    setLeft((index < handles.length ? r.left : r.right) - stripLeft);
  }, [index, stripRef]);
  if (left === null) return null;
  return (
    <div
      className={clsx(
        "pointer-events-none absolute z-30 w-[2px] rounded-full bg-accent",
        // Chat pills are inset; content tabs run edge to edge.
        isChat ? "inset-y-2" : "inset-y-0",
      )}
      style={{ left: left - 1 }}
    />
  );
}

export function TabBar({
  tile,
  variant = "content",
  topRight = false,
  topLeft = false,
}: {
  tile: TileNode;
  variant?: TileVariant;
  topRight?: boolean;
  topLeft?: boolean;
}) {
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const closeOtherTabs = useWorkspaceStore((s) => s.closeOtherTabs);
  const splitTile = useWorkspaceStore((s) => s.splitTile);
  const openTabInNewWindow = useWorkspaceStore((s) => s.openTabInNewWindow);
  const togglePinnedTab = useWorkspaceStore((s) => s.togglePinnedTab);
  // Pin/unpin targets the active scope's workspace (content tiles only ever
  // render inside the window's active scope); null in a standalone-agent scope.
  const scopeId = useActiveScopeId();
  const workspaceId = workspaceIdOfScope(scopeId);
  const pinned = useWorkspaceStore((s) =>
    workspaceId ? pinnedTabsFor(s.pinnedTabs, workspaceId) : null,
  );

  // Only fade the right edge when the tab strip actually overflows, so the
  // active tab's right border stroke is never covered when tabs fit.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tile.tabs.length]);

  const isChat = variant === "chat";
  const crumbs = isChat && useFeatureFlags((s) => s.ephemeralTabs === "crumbs");

  // Whether this content pane is the window's focused one: its active tab keeps
  // full-strength chrome while resting panes dim theirs. Chat panes track focus
  // by active agent instead (see TabHandle). A focused id that isn't in the
  // current layout (unset, or stale after a scope switch) dims nothing.
  const content = useActiveContent();
  const focusedTileId = useWindow()?.focusedContentTileId;
  const paneFocused =
    isChat ||
    !focusedTileId ||
    focusedTileId === tile.id ||
    !hasNode(content.layout, focusedTileId);

  // Insertion slot while a dragged tab hovers this tile's strip (null otherwise).
  const dropIndex = useTabDragStore((s) =>
    s.target?.scope === "tile" && s.target.tileId === tile.id && s.target.zone === "tab"
      ? (s.target.index ?? null)
      : null,
  );

  return (
    // Chat bars sit flush on the chrome surface (no divider hairline): their
    // tabs are inset rounded pills rather than full-height rectangles.
    <div
      className={clsx(
        "flex shrink-0 items-stretch bg-chrome",
        isChat ? "h-[var(--titlebar-h)]" : "h-toolbar",
        !isChat && "shadow-[inset_0_-1px_0_0_var(--border-tertiary)]",
      )}
    >
      {/* This tab bar owns the window's top-left corner: host the re-expand
          cluster (traffic lights + nav). The cluster self-gates on
          `sidebarCollapsed`, rendering nothing while the sidebar is expanded, and
          its traffic lights close the window when it's a detached one. `pl-3.5`
          matches the sidebar header inset; the full-height right border divides
          it from the first tab (content bars only). */}
      {topLeft && (
        <SidebarReexpandCluster
          className={clsx("pl-3.5 pr-2", !isChat && "border-r border-tertiary")}
        />
      )}
      {crumbs ? (
        <ChatCrumbs tile={tile} />
      ) : (
        <>
      <div
        ref={scrollRef}
        data-tab-strip=""
        className={clsx(
          "no-scrollbar relative flex items-stretch overflow-x-auto",
          // Pills get a vertical inset + gaps instead of stretching edge to edge.
          isChat && "gap-1 py-2 pl-1.5",
        )}
        style={
          overflowing ? { maskImage: OVERFLOW_MASK, WebkitMaskImage: OVERFLOW_MASK } : undefined
        }
      >
        {tile.tabs.map((tab, index) => {
          const closable = !isChat || index > 0;
          return (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger asChild>
              <div className="flex items-stretch">
                <TabHandle
                  tab={tab}
                  tileId={tile.id}
                  variant={variant}
                  active={tab.id === tile.activeTabId}
                  paneFocused={paneFocused}
                  closable={closable}
                  onSelect={() => setActiveTab(tile.id, tab.id)}
                  onClose={() => closeTab(tile.id, tab.id)}
                />
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {/* Chat pills omit split: cloning a chat tile only mirrors the same
                  agent, which we disallow (redundant chats). */}
              {!isChat && (
                <>
                  <ContextMenuSection>
                    <ContextMenuItem onSelect={() => splitTile(tile.id, "right")}>
                      <Icon name="layout-split-horizontal" size="base" color="tertiary" />
                      Split Right
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => splitTile(tile.id, "down")}>
                      <Icon name="layout-split-vertical" size="base" color="tertiary" />
                      Split Down
                    </ContextMenuItem>
                  </ContextMenuSection>
                  <ContextMenuSeparator />
                </>
              )}
              <ContextMenuSection>
                <ContextMenuItem onSelect={() => openTabInNewWindow(tile.id, tab.id, newWindowGeo())}>
                  <Icon name="focus-window" size="base" color="tertiary" />
                  Open in New Window
                </ContextMenuItem>
                {/* Pin the tab's TYPE to the workspace (chat and standalone
                    scopes have no workspace to pin to). */}
                {!isChat && workspaceId && pinned && (
                  <ContextMenuItem onSelect={() => togglePinnedTab(workspaceId, tab.type)}>
                    <Icon
                      name={pinned.includes(tab.type) ? "pin-slash" : "pin"}
                      size="base"
                      color="tertiary"
                    />
                    {pinned.includes(tab.type) ? "Unpin Tab" : "Pin Tab"}
                  </ContextMenuItem>
                )}
              </ContextMenuSection>
              <ContextMenuSeparator />
              <ContextMenuSection>
                {closable && (
                  <ContextMenuItem onSelect={() => closeTab(tile.id, tab.id)}>
                    <Icon name="x" size="base" color="tertiary" />
                    Close Tab
                  </ContextMenuItem>
                )}
                <ContextMenuItem
                  disabled={tile.tabs.length <= 1}
                  onSelect={() => {
                    if (!isChat) {
                      closeOtherTabs(tile.id, tab.id);
                      return;
                    }
                    const keepFirst = tile.tabs[0]?.id;
                    for (const t of tile.tabs) {
                      if (t.id !== tab.id && t.id !== keepFirst) closeTab(tile.id, t.id);
                    }
                  }}
                >
                  <Icon name="x" size="base" color="tertiary" />
                  Close Other Tabs
                </ContextMenuItem>
              </ContextMenuSection>
            </ContextMenuContent>
          </ContextMenu>
          );
        })}
        {dropIndex !== null && (
          <InsertionCaret index={dropIndex} stripRef={scrollRef} isChat={isChat} />
        )}
      </div>
      {!isChat && !isProjectScope(scopeId) && <AddTabMenu tileId={tile.id} />}
      {isChat && <ProjectAgentsMenu tile={tile} />}
        </>
      )}
      {/* Empty bar area also opens the split / close menu (chat hides split). */}
      <TileContextMenu tileId={tile.id} className="flex-1" showSplit={!isChat}>
        <div className="h-full w-full" />
      </TileContextMenu>
      {topRight && (
        <div className="flex shrink-0 items-center gap-0.5 pr-[6px]">
          <ChatToggle />
          <SplitToggle />
        </div>
      )}
    </div>
  );
}
