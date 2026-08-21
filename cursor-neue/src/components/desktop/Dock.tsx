import { Icon } from "@/components/ui/Icon";
import { AppearanceMenu } from "@/components/desktop/AppearanceMenu";
import { ScreenshotMenu } from "@/components/desktop/ScreenshotMenu";
import { TILE_BTN } from "@/components/desktop/dockTile";
import { MAIN_WINDOW_ID, useWorkspaceStore } from "@/store/useWorkspaceStore";

// Centered launcher pinned 6px from the desktop's left edge. Mirrors the Cursor
// Design System "Dock" (node 21190:92765): a translucent rounded bar of 44px
// app tiles with a hairline border + inset top highlight. Tiles, top to bottom:
// the Cursor app (focus/relaunch the main window) and the appearance gear
// (theme and reset-demo). Living on the left keeps the
// vertical axis clear, so windows (and the centered screenshot) sit at true
// center instead of being biased up around it.
// Surfaces use luminous stops (not neutral) so the glass bar stays light-on-dark
// in both themes; only the Cursor tile keeps its solid editor background.

export function Dock() {
  const hasMain = useWorkspaceStore((s) => !!s.windows[MAIN_WINDOW_ID]);
  const focusWindow = useWorkspaceStore((s) => s.focusWindow);
  const restoreMainWindow = useWorkspaceStore((s) => s.restoreMainWindow);

  // Focus the main window, or relaunch it if every window was closed.
  const openCursor = () => (hasMain ? focusWindow(MAIN_WINDOW_ID) : restoreMainWindow());

  return (
    // Container ignores pointer events so the gaps around the bar stay
    // click-through to windows behind it; the bar itself opts back in.
    <div className="pointer-events-none absolute inset-y-0 left-1.5 z-[200] flex items-center">
      <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-[24px] border border-[color:var(--bg-luminous-secondary)] bg-luminous-secondary p-4 backdrop-blur-[8px]">
        {/* Relative wrapper keeps the running-app dot anchored to the dock bar
            while the button lifts on hover (the dot must not inherit that
            transform). */}
        <div className="relative">
          <button
            type="button"
            aria-label="Cursor"
            onClick={openCursor}
            className={`${TILE_BTN} bg-editor`}
          >
            <Icon name="cursor-logo-filled" size="xl" color="primary" />
          </button>
          {/* Running-app indicator: sits 4px inside the dock bar's outer (left)
              edge. The tile is 44px wide with 16px of bar padding beside it, so
              the 4px dot's edge lands 8px past the tile's left side. */}
          <span
            aria-hidden
            className="pointer-events-none absolute right-[calc(100%+8px)] top-1/2 size-1 -translate-y-1/2 rounded-full bg-luminous"
          />
        </div>
        <ScreenshotMenu />
        <AppearanceMenu />
      </div>
    </div>
  );
}
