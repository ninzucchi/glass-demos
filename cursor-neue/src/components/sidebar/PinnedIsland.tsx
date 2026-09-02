import { Icon, type IconName } from "@/components/ui/Icon";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { menuItemButtonClass } from "@/components/ui/menu";
import { TAB_REGISTRY, tabIcon } from "@/components/tabs/registry";
import { SidebarSectionHeader } from "@/components/sidebar/SidebarControls";
import {
  contextTabHasOpenFile,
  filesTabHasOpenFile,
  pinnedTabsFor,
  TAB_LABEL,
  workspaceIdOfScope,
  type Tab,
  type TabType,
} from "@/types";
import { projectBoardIcon, tabTypeLabel } from "@/lib/mergedLabels";
import { prTabTitle, pullRequestById } from "@/data/pullRequests";
import { useMergedSidebar } from "@/store/useFeatureFlags";
import { useWindowId } from "@/components/window/WindowContext";
import {
  useActiveContent,
  useActiveScopeId,
  useWorkspaceStore,
} from "@/store/useWorkspaceStore";
import { allTabs } from "@/store/layoutTree";

// Stable empty set so the zustand selector never fabricates a new reference.
const NO_PINS: TabType[] = [];

function islandTabLabel(tab: Tab, merged: boolean): string {
  if (tab.type === "files" && !filesTabHasOpenFile(tab)) return TAB_LABEL.files;
  if (tab.type === "context" && !contextTabHasOpenFile(tab)) return TAB_LABEL.context;
  if (tab.type === "project") return tabTypeLabel("project", merged);
  if (tab.type === "pr" && tab.prId) {
    const pr = pullRequestById(tab.prId);
    if (pr) return prTabTitle(pr);
  }
  return tab.title;
}

/** Island row: menu-item look (height, hover fill) on a plain button — or, in
 *  the compact rail, a square icon-only button (label moves to the tooltip).
 *  Wrapped in a right-click pin/unpin menu when the active scope is a workspace. */
function IslandRow({
  icon,
  label,
  type,
  workspaceId,
  pinned,
  compact,
  onClick,
}: {
  icon: IconName;
  label: string;
  type: TabType;
  workspaceId: string | null;
  pinned: TabType[];
  compact: boolean;
  onClick: () => void;
}) {
  const togglePinnedTab = useWorkspaceStore((s) => s.togglePinnedTab);
  const merged = useMergedSidebar();
  const pinLabel = tabTypeLabel(type, merged);
  const row = compact ? (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-lg hover:bg-quaternary"
    >
      <Icon name={icon} size="base" color="tertiary" />
    </button>
  ) : (
    <button type="button" onClick={onClick} className={menuItemButtonClass}>
      <Icon name={icon} size="base" color="tertiary" />
      <span className="truncate">{label}</span>
    </button>
  );
  if (!workspaceId || type === "pr") return row;
  const isPinned = pinned.includes(type);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuSection>
          <ContextMenuItem onSelect={() => togglePinnedTab(workspaceId, type)}>
            <Icon name={isPinned ? "pin-slash" : "pin"} size="base" color="tertiary" />
            {isPinned ? `Unpin ${pinLabel}` : `Pin ${pinLabel}`}
          </ContextMenuItem>
        </ContextMenuSection>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** Flat mini island floated at the window's top-right: one "N Tabs" list with
 *  the workspace's pinned tab types on top, a hairline, then the scope's
 *  remaining open tabs. No panel chrome — rows reuse the menu item styling;
 *  right-click pins/unpins a type.
 *
 *  `compact` (the window is too narrow for the full island to sit clear of the
 *  centered chat column) swaps the labeled rows for an icon-only rail in a
 *  bordered capsule. */
export function PinnedIsland({ compact = false }: { compact?: boolean }) {
  const windowId = useWindowId();
  const scopeId = useActiveScopeId();
  const content = useActiveContent();
  const workspaceId = workspaceIdOfScope(scopeId);
  const pinned = useWorkspaceStore((s) =>
    workspaceId ? pinnedTabsFor(s.pinnedTabs, workspaceId) : NO_PINS,
  );
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const setContentOpen = useWorkspaceStore((s) => s.setContentOpen);
  const openPinnedTab = useWorkspaceStore((s) => s.openPinnedTab);
  const merged = useMergedSidebar();

  // The island is an entry point into the (closed) content pane; once that
  // pane is open its own tab bar shows the same surfaces, so the island hides.
  // After the last tab is closed the scope is `cleared` — nothing to list, and
  // the next content-panel open reseeds the main defaults instead.
  if (content.open || content.cleared) return null;

  // Strip order (left-to-right, top-to-bottom) — the island mirrors it vertically.
  const openTabs = allTabs(content.layout);
  // Each pinned row stands in for the FIRST open tab of its type (the one it
  // focuses on click); only that tab is absorbed. Further tabs of the same type
  // (e.g. a second Files tab on another file) still list individually below.
  const absorbedIds = new Set(
    pinned
      .map((type) => openTabs.find(({ tab }) => tab.type === type)?.tab.id)
      .filter((id): id is string => !!id),
  );
  const otherTabs = openTabs.filter(({ tab }) => !absorbedIds.has(tab.id));
  // Strict mirror of the tab group: only pinned types whose tab actually
  // exists get a row (the store seeds them into every workspace scope), in
  // strip order. A type with no tab (stale pre-seed state) shows nothing
  // rather than a phantom row.
  const stripIndex = (type: TabType) => openTabs.findIndex(({ tab }) => tab.type === type);
  const orderedPinned = pinned
    .filter((type) => stripIndex(type) !== -1)
    .sort((a, b) => stripIndex(a) - stripIndex(b));
  // Nothing to show: no pinned rows and no remaining open tabs.
  if (orderedPinned.length === 0 && otherTabs.length === 0) return null;

  const tabCount = `${openTabs.length} ${openTabs.length === 1 ? "Tab" : "Tabs"}`;

  return (
    <div
      className={
        compact
          ? "flex flex-col items-center gap-0.5 rounded-xl border border-secondary bg-elevated p-1"
          : "flex flex-col gap-px text-base text-primary"
      }
    >
      {!compact && <SidebarSectionHeader label={tabCount} />}
      {orderedPinned.map((type) => {
        // A pinned row mirrors its absorbed tab when one is open, so e.g. the
        // Files row shows the open file's name + file-type icon.
        const absorbed = openTabs.find(({ tab }) => tab.type === type)?.tab;
        // Files home uses the canonical label even if the stored title is stale.
        const absorbedLabel = absorbed ? islandTabLabel(absorbed, merged) : undefined;
        return (
          <IslandRow
            key={type}
            icon={
              absorbed
                ? tabIcon(absorbed, merged)
                : type === "project"
                  ? projectBoardIcon(merged)
                  : TAB_REGISTRY[type].icon
            }
            label={absorbedLabel ?? tabTypeLabel(type, merged)}
            type={type}
            workspaceId={workspaceId}
            pinned={pinned}
            compact={compact}
            onClick={() => openPinnedTab(windowId, type)}
          />
        );
      })}
      {orderedPinned.length > 0 && otherTabs.length > 0 && (
        <div
          className={
            compact ? "h-px w-4 bg-[var(--border-quaternary)]" : "my-1 h-px bg-[var(--border-quaternary)]"
          }
        />
      )}
      {otherTabs.map(({ tile, tab }) => (
        <IslandRow
          key={tab.id}
          icon={tabIcon(tab, merged)}
          label={islandTabLabel(tab, merged)}
          type={tab.type}
          workspaceId={workspaceId}
          pinned={pinned}
          compact={compact}
          onClick={() => {
            setActiveTab(tile.id, tab.id);
            setContentOpen(windowId, true);
          }}
        />
      ))}
    </div>
  );
}
