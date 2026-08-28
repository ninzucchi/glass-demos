import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import type { Tab } from "@/types";
import { TAB_LABEL, filesTabHasOpenFile, pinnedTabsFor, workspaceIdOfScope } from "@/types";
import { tabIcon } from "@/components/tabs/registry";
import { useTabDragStore } from "@/store/tabDrag";
import {
  useActiveAgent,
  useActiveContent,
  useActiveScopeId,
  useWorkspaceStore,
} from "@/store/useWorkspaceStore";
import { allTabs } from "@/store/layoutTree";
import { isOutsideWindows, newWindowGeo } from "@/components/desktop/geometry";
import { beginTabDrag } from "@/components/tile/tabDragInteraction";
import type { TileVariant } from "@/components/tile/Tile";
import { useFeatureFlags } from "@/store/useFeatureFlags";

interface TabHandleProps {
  tab: Tab;
  tileId: string;
  variant?: TileVariant;
  active: boolean;
  /** Content only: false when this tab's pane isn't the window's focused one,
   *  dimming an active tab so only one pane reads as live. */
  paneFocused?: boolean;
  onSelect: () => void;
  onClose: () => void;
  /** False hides the hover × and ignores middle-click close. */
  closable?: boolean;
}

// The 1px chrome->content divider drawn along every tab's bottom edge.
const HAIRLINE = "shadow-[inset_0_-1px_0_0_var(--border-tertiary)]";

export function TabHandle({
  tab,
  tileId,
  variant = "content",
  active,
  paneFocused = true,
  onSelect,
  onClose,
  closable = true,
}: TabHandleProps) {
  const moveTab = useWorkspaceStore((s) => s.moveTab);
  const moveTabToRoot = useWorkspaceStore((s) => s.moveTabToRoot);
  const moveTabToChatRoot = useWorkspaceStore((s) => s.moveTabToChatRoot);
  const openContentWithTab = useWorkspaceStore((s) => s.openContentWithTab);
  const openTabInNewWindow = useWorkspaceStore((s) => s.openTabInNewWindow);
  // Chat tab titles derive from the agent at render time, so renames stay live.
  // Files home always shows the canonical label (not a stale stored title).
  const agentTitle = useWorkspaceStore((s) =>
    tab.agentId ? s.agents[tab.agentId]?.title : undefined,
  );
  const title =
    agentTitle ??
    (tab.type === "files" && !filesTabHasOpenFile(tab) ? TAB_LABEL.files : tab.title);
  // THE pinned tab of its type — the strip's first, the one the island row
  // stands in for — swaps the hover × for an unpin control (further tabs of the
  // same type keep their regular close). Matches the island's absorbed-tab rule.
  const workspaceId = workspaceIdOfScope(useActiveScopeId());
  const pinnedSet = useWorkspaceStore((s) =>
    variant !== "chat" && workspaceId ? pinnedTabsFor(s.pinnedTabs, workspaceId) : null,
  );
  const togglePinnedTab = useWorkspaceStore((s) => s.togglePinnedTab);
  const pinEphemeralTab = useWorkspaceStore((s) => s.pinEphemeralTab);
  const ephemeralTabsOn = useFeatureFlags((s) => s.ephemeralTabs === "tabs");
  const isEphemeralChat = variant === "chat" && ephemeralTabsOn && !!tab.ephemeral;
  const content = useActiveContent();
  const isPinnedType = !!pinnedSet?.includes(tab.type);
  const isPinnedTab =
    isPinnedType &&
    allTabs(content.layout).find(({ tab: t }) => t.type === tab.type)?.tab.id === tab.id;
  const dragging = useTabDragStore((s) => s.source?.tabId === tab.id);
  // Suppress the click-to-select that fires right after a drag ends.
  const didDragRef = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) =>
    beginTabDrag(e, {
      createSource: () => ({
        tileId,
        tabId: tab.id,
        title,
        icon: tabIcon(tab),
        pane: variant,
        tabType: tab.type,
        // Carried so the drag layer can reject splitting/tabbing a chat against
        // another instance of the same agent (see `duplicatesChat`).
        agentId: tab.agentId,
        // Lets the drag layer clamp strip slots so plain tabs can't reorder
        // into a strip's pinned leading group (and pinned tabs can't leave it).
        pinnedType: isPinnedTab,
      }),
      // Dropping a tab back onto its own tab bar is a no-op, so don't preview it.
      suppressSelfTile: true,
      didDragRef,
      onDrop: (source, target, pointer) => {
        if (target) {
          if (target.scope === "root") {
            moveTabToRoot(source.tileId, source.tabId, target.windowId, target.scopeId, target.side);
          } else if (target.scope === "chat-root") {
            moveTabToChatRoot(source.tileId, source.tabId, target.windowId, target.side);
          } else if (target.scope === "open") {
            openContentWithTab(source.tileId, source.tabId, target.windowId, target.scopeId);
          } else {
            moveTab(source.tileId, source.tabId, target.tileId, target.zone, target.index);
          }
        } else if (isOutsideWindows(pointer.x, pointer.y)) {
          openTabInNewWindow(source.tileId, source.tabId, newWindowGeo(pointer));
        }
      },
    });

  const isChat = variant === "chat";
  // Chat pills mirror the sidebar's selection metaphor: the tinted bg marks the
  // WINDOW's active agent (the one driving the content pane), not merely each
  // tile's active tab — so a resting tile's tab stays flat until focused.
  const activeAgentId = useActiveAgent()?.id;
  const focusedChat = isChat && active && !!tab.agentId && tab.agentId === activeAgentId;
  // Content tabs keep the chrome->content divider hairline along their bottom
  // edge, so the strip reads as one continuous line above the content below.
  // Chat tabs are inset rounded pills (like sidebar rows), so no hairline.
  // Content tab background, so the hover gradient behind the close button
  // matches. Chat pills can't use the gradient trick (their quaternary bg is
  // translucent, so the fade never goes opaque); they mask the label instead.
  const tabBg = active ? "var(--bg-editor)" : "var(--bg-chrome)";
  return (
    <div
      onPointerDown={onPointerDown}
      onClick={() => {
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        onSelect();
      }}
      onDoubleClick={() => {
        if (didDragRef.current) return;
        if (isEphemeralChat) pinEphemeralTab(tileId, tab.id);
      }}
      onAuxClick={(e) => {
        if (e.button === 1 && closable) {
          e.preventDefault();
          onClose();
        }
      }}
      data-no-drag=""
      data-tab-id={tab.id}
      // Marks the strip's pinned leading group for the drag layer's slot clamp.
      data-pinned={isPinnedTab ? "" : undefined}
      className={clsx(
        "group/tab relative flex max-w-[220px] shrink-0 cursor-default select-none items-center gap-[8px]",
        isChat
          ? clsx(
              // Only the window's focused chat gets the tinted pill; every other
              // open chat tab rests (tertiary + hover), even the active tab of a
              // non-focused tile.
              "rounded-lg pl-[5px] pr-[6px] transition-colors",
              focusedChat
                ? "bg-quaternary text-primary"
                : "text-secondary hover:bg-quaternary hover:text-primary",
            )
          : clsx(
              "min-w-[120px] border-r border-tertiary py-[9px] pl-[11px] pr-[12px]",
              active
                ? clsx(
                    "bg-editor",
                    // A resting pane's active tab keeps its surface but drops to
                    // secondary, so only the focused pane's tab reads as live.
                    paneFocused ? "text-primary" : "text-secondary hover:text-primary",
                  )
                : "bg-chrome text-tertiary hover:text-secondary",
              HAIRLINE,
            ),
        dragging && "opacity-40",
      )}
    >
      {/* Chat pills are text-only; content tabs keep their type/file icon. */}
      {!isChat && (
        <Icon
          name={tabIcon(tab)}
          size="base"
          color={active && paneFocused ? "secondary" : "tertiary"}
        />
      )}
      {/* Chat: fade the label's right edge under the close x via a mask (the
          pill bg is translucent, so an opaque gradient overlay isn't possible).
          The last 18px — the x's full footprint — stays fully transparent, with
          the fade running over the 26px before it. */}
      <span
        className={clsx(
          "min-w-0 truncate px-[2px] text-base leading-[18px]",
          isEphemeralChat && "italic",
          isChat &&
            closable &&
            "group-hover/tab:[mask-image:linear-gradient(to_right,#000,#000_calc(100%_-_44px),transparent_calc(100%_-_18px))]",
        )}
      >
        {title}
      </span>
      {/* Trailing affordance, hover-only for ALL tabs: the pinned tab of a type
          shows unpin (close it via right-click or middle-click); everything else
          shows the close x. Content tabs fade the title cleanly under it with a
          gradient matching the tab's opaque bg. */}
      {closable && (
        <div
          className={clsx(
            "pointer-events-none absolute inset-y-0 right-0 flex items-center pl-6 opacity-0 group-hover/tab:opacity-100",
            // Chat pills tuck the x into their tighter trailing inset.
            isChat ? "pr-[3px]" : "pr-2",
            // The opaque fade would paint over the bottom hairline, so re-draw it.
            !isChat && HAIRLINE,
          )}
          style={
            isChat
              ? undefined
              : { background: `linear-gradient(to right, transparent, ${tabBg} 24px)` }
          }
        >
          <button
            type="button"
            aria-label={isPinnedTab ? "Unpin tab" : "Close tab"}
            data-no-drag=""
            className="pointer-events-auto flex size-5 shrink-0 items-center justify-center rounded hover:bg-quaternary"
            onClick={(e) => {
              e.stopPropagation();
              if (isPinnedTab && workspaceId) togglePinnedTab(workspaceId, tab.type);
              else onClose();
            }}
          >
            <Icon name={isPinnedTab ? "pin-slash" : "x"} size="base" color="secondary" />
          </button>
        </div>
      )}
    </div>
  );
}
