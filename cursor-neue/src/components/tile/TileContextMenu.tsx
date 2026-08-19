import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { newWindowGeo } from "@/components/desktop/geometry";

interface TileContextMenuProps {
  tileId: string;
  className?: string;
  children: ReactNode;
  /** Chat tiles hide split actions: cloning a chat tile only mirrors the same
   *  agent, which we disallow (redundant chats). */
  showSplit?: boolean;
}

/** Wraps a region of a tile; right-click opens split / open-in-window /
 *  close-tile actions. */
export function TileContextMenu({ tileId, className, children, showSplit = true }: TileContextMenuProps) {
  const splitTile = useWorkspaceStore((s) => s.splitTile);
  const closeTile = useWorkspaceStore((s) => s.closeTile);
  const openTileInNewWindow = useWorkspaceStore((s) => s.openTileInNewWindow);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={className}>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {showSplit && (
          <>
            <ContextMenuSection>
              <ContextMenuItem onSelect={() => splitTile(tileId, "right")}>
                <Icon name="layout-split-horizontal" size="base" color="tertiary" />
                Split Right
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => splitTile(tileId, "down")}>
                <Icon name="layout-split-vertical" size="base" color="tertiary" />
                Split Down
              </ContextMenuItem>
            </ContextMenuSection>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuSection>
          <ContextMenuItem onSelect={() => openTileInNewWindow(tileId, newWindowGeo())}>
            <Icon name="focus-window" size="base" color="tertiary" />
            Open in New Window
          </ContextMenuItem>
        </ContextMenuSection>
        <ContextMenuSeparator />
        <ContextMenuSection>
          <ContextMenuItem onSelect={() => closeTile(tileId)}>
            <Icon name="x" size="base" color="tertiary" />
            Close Tile
          </ContextMenuItem>
        </ContextMenuSection>
      </ContextMenuContent>
    </ContextMenu>
  );
}
