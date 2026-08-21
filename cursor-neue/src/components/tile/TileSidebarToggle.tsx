import { IconButton } from "@/components/ui/IconButton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSection,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Tab, TileNode } from "@/types";
import { tileSidebarOpen } from "@/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { type SidebarPlacement, useAppearanceStore } from "@/store/useAppearanceStore";

/** Toggles the tile's sidebar for the tab's type. State is shared by type
 *  within the tile. Pinned at the tile's sidebar-side edge so its x position
 *  never changes between open/closed states; the glyph mirrors the global
 *  sidebar placement. Right-click exposes the global left/right placement
 *  controls. */
export function TileSidebarToggle({ tile, tab }: { tile: TileNode; tab: Tab }) {
  const toggleTileSidebar = useWorkspaceStore((s) => s.toggleTileSidebar);
  const sidebarPlacement = useAppearanceStore((s) => s.sidebarPlacement);
  const setSidebarPlacement = useAppearanceStore((s) => s.setSidebarPlacement);
  const isRight = sidebarPlacement === "right";
  const open = tileSidebarOpen(tile, tab.type);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <IconButton
          name={isRight ? "layout-sidebar-right" : "layout-sidebar-left"}
          size="base"
          active={open}
          onClick={() => toggleTileSidebar(tile.id, tab.type)}
          aria-label="Toggle sidebar"
          aria-pressed={open}
        />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuSection>
          <ContextMenuLabel>Sidebar Placement</ContextMenuLabel>
          <ContextMenuRadioGroup
            value={sidebarPlacement}
            onValueChange={(v) => setSidebarPlacement(v as SidebarPlacement)}
          >
            <ContextMenuRadioItem value="left">Left</ContextMenuRadioItem>
            <ContextMenuRadioItem value="right">Right</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuSection>
      </ContextMenuContent>
    </ContextMenu>
  );
}
