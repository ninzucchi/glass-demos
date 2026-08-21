import type { TileNode } from "@/types";
import { tileSidebarOpen } from "@/types";
import { TAB_REGISTRY } from "@/components/tabs/registry";
import { TabBar } from "@/components/tile/TabBar";
import { SecondaryToolbar } from "@/components/tile/SecondaryToolbar";
import { TabSidebar } from "@/components/tile/TabSidebar";
import { TileContextMenu } from "@/components/tile/TileContextMenu";
import { TileDropZone } from "@/components/tile/TileDropZone";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export type TileVariant = "content" | "chat";

export function Tile({
  tile,
  variant,
  topRight = false,
  topLeft = false,
}: {
  tile: TileNode;
  variant: TileVariant;
  topRight?: boolean;
  topLeft?: boolean;
}) {
  const focusChatTile = useWorkspaceStore((s) => s.focusChatTile);
  const focusContentTile = useWorkspaceStore((s) => s.focusContentTile);
  const activeTab = tile.tabs.find((t) => t.id === tile.activeTabId) ?? tile.tabs[0];
  if (!activeTab) return null;
  const def = TAB_REGISTRY[activeTab.type];

  // Chat tiles run the same tab/split/drag chrome as content; the fork is
  // presentational only: chrome base surface, no secondary toolbar/sidebar.
  // Pointer-down anywhere in the tile makes its agent the window's active one
  // (swapping the content pane to that agent's branch scope).
  if (variant === "chat") {
    return (
      <div
        data-tile-id={tile.id}
        data-pane="chat"
        onPointerDownCapture={() => focusChatTile(tile.id)}
        className="relative flex h-full min-h-0 flex-col overflow-hidden bg-chrome"
      >
        <TabBar tile={tile} variant="chat" topRight={topRight} topLeft={topLeft} />
        <div className="min-h-0 flex-1">
          <def.Content tab={activeTab} tileId={tile.id} />
        </div>
        <TileDropZone tileId={tile.id} />
      </div>
    );
  }

  const sidebar = def.hasSidebar ? { tile, tab: activeTab } : undefined;
  const sidebarOpen = !!sidebar && tileSidebarOpen(tile, activeTab.type);

  return (
    <div
      data-tile-id={tile.id}
      data-pane="content"
      onPointerDownCapture={() => focusContentTile(tile.id)}
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-editor"
    >
      <TabBar tile={tile} topRight={topRight} topLeft={topLeft} />
      <TileContextMenu tileId={tile.id} className="flex min-h-0 flex-1">
        {/* When open, the sidebar (with the pinned toggle in its header) pushes
            the breadcrumb + content right. When closed, the toggle lives at the
            left of the secondary toolbar, so its x stays fixed across states. */}
        {sidebar && sidebarOpen && <TabSidebar tile={sidebar.tile} tab={sidebar.tab} />}
        {/* min-w-0 lets this column shrink to the tile width; without it, wide
            tab content (e.g. the browser mock) sets a min-content floor that
            overflows the tile and pushes a right-docked toolbar toggle off-edge. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <SecondaryToolbar tile={tile} tab={activeTab} showToggle={!!sidebar && !sidebarOpen} />
          <div className="min-h-0 flex-1 overflow-auto">
            <def.Content tab={activeTab} tileId={tile.id} />
          </div>
        </div>
      </TileContextMenu>
      <TileDropZone tileId={tile.id} />
    </div>
  );
}
