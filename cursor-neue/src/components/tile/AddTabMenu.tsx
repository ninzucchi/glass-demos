import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSection,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { TAB_REGISTRY } from "@/components/tabs/registry";
import { CONTENT_TAB_TYPES, TAB_LABEL } from "@/types";
import { useActiveScopeId, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useUiStore } from "@/store/useUiStore";
import { useWindowId } from "@/components/window/WindowContext";
import { fileIconFor, getRecentFiles } from "@/data/files";
import type { TileVariant } from "@/components/tile/Tile";

export function AddTabMenu({
  tileId,
  variant = "content",
}: {
  tileId: string;
  variant?: TileVariant;
}) {
  const addTab = useWorkspaceStore((s) => s.addTab);
  const addAgentTab = useWorkspaceStore((s) => s.addAgentTab);
  const openCustomize = useUiStore((s) => s.openCustomize);
  const windowId = useWindowId();
  // Recents come from the active workspace's file tree (same source as the
  // Files tab), so the menu shows files that actually exist in this workspace.
  const recents = getRecentFiles(useActiveScopeId());

  // Chat tab bar: "+" starts a new agent as a new tab in this tile (inheriting
  // the tile's workspace/branch context) directly — no menu, it's one action.
  // Styled to match an inactive chat pill (tertiary at rest, hover fill).
  if (variant === "chat") {
    return (
      <button
        type="button"
        data-no-drag=""
        aria-label="New agent"
        onClick={() => addAgentTab(tileId)}
        className="mx-1.5 flex size-6 shrink-0 items-center justify-center self-center rounded-lg text-secondary transition-colors hover:bg-quaternary hover:text-primary"
      >
        <Icon name="plus" size="base" color="inherit" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton name="plus" size="base" aria-label="Add tab" className="mx-1.5 self-center" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuSection>
          {CONTENT_TAB_TYPES.map((type) => (
            <DropdownMenuItem key={type} onSelect={() => addTab(tileId, type)}>
              <Icon name={TAB_REGISTRY[type].icon} size="base" color="tertiary" />
              {TAB_LABEL[type]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSection>
        <DropdownMenuSeparator />
        <DropdownMenuSection>
          <DropdownMenuLabel>Recents</DropdownMenuLabel>
          {recents.map((recent, i) => (
            <DropdownMenuItem
              key={`${recent.folder}/${recent.name}-${i}`}
              onSelect={() =>
                addTab(tileId, "files", { title: recent.name, folder: recent.folder })
              }
            >
              <Icon name={fileIconFor(recent.name)} size="base" color="tertiary" />
              {recent.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSection>
        <DropdownMenuSeparator />
        <DropdownMenuSection>
          <DropdownMenuItem onSelect={() => openCustomize(windowId)}>
            <Icon name="extensions" size="base" color="tertiary" />
            Customize
          </DropdownMenuItem>
        </DropdownMenuSection>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
