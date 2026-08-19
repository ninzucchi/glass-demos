import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { WindowFrame } from "@/components/desktop/WindowFrame";
import { Dock } from "@/components/desktop/Dock";
import { Window } from "@/components/window/Window";
import { WindowProvider } from "@/components/window/WindowContext";
import { centeredWindowGeo } from "@/components/desktop/geometry";
import { MAIN_WINDOW_ID, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { wallpaperBackground, preloadWallpapers } from "@/lib/wallpaper";
import { WALLPAPERS } from "@/config";
import { useAppearanceStore } from "@/store/useAppearanceStore";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSection,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function Desktop() {
  const wallpaper = useAppearanceStore((s) => s.wallpaper);
  const setWallpaper = useAppearanceStore((s) => s.setWallpaper);
  const ref = useRef<HTMLDivElement>(null);
  const bounds = useCallback(() => ref.current?.getBoundingClientRect() ?? null, []);

  useEffect(() => {
    preloadWallpapers();
  }, []);

  // Cmd/Ctrl+N creates a new agent in the focused window (top of the stack).
  // One document-level listener owns the shortcut for every window; state is read
  // at call time so it binds once and never re-attaches on order changes.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.key.toLowerCase() !== "n") return;
      const { windowOrder: order, createAgent } = useWorkspaceStore.getState();
      const focused = order[order.length - 1];
      if (!focused) return;
      e.preventDefault();
      createAgent(focused);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Pane shortcuts on the focused window, sharing the single-listener pattern of
  // Cmd/Ctrl+N (state read at call time so the binding never re-attaches):
  //   Cmd/Ctrl+,  toggle the left sidebar
  //   Cmd/Ctrl+.  toggle the agent (chat) pane
  //   Cmd/Ctrl+/  toggle the content pane
  //   Cmd/Ctrl+\  toggle content maximize (sidebar + chat collapsed)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key !== "," && e.key !== "." && e.key !== "/" && e.key !== "\\") return;
      const state = useWorkspaceStore.getState();
      const focused = state.windowOrder[state.windowOrder.length - 1];
      const win = focused ? state.windows[focused] : undefined;
      if (!win) return;
      e.preventDefault();
      switch (e.key) {
        case ",":
          state.toggleSidebar(focused);
          break;
        case ".":
          state.toggleChat(focused);
          break;
        case "/":
          state.toggleContentOpen(focused);
          break;
        case "\\":
          state.setMaximized(focused, !(win.sidebarCollapsed && win.chatCollapsed));
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const windowOrder = useWorkspaceStore((s) => s.windowOrder);
  const windows = useWorkspaceStore((s) => s.windows);
  const setWindowGeo = useWorkspaceStore((s) => s.setWindowGeo);
  const focusWindow = useWorkspaceStore((s) => s.focusWindow);
  const setMaximized = useWorkspaceStore((s) => s.setMaximized);

  // Center the main window once measured (its geo is null until then). Detached
  // windows are positioned by the store at spawn time. `mainExists` is a
  // separate dep so relaunching from the dock (absent → present, geo still
  // null) re-runs the effect; keying on `mainGeo` alone never changes (null →
  // null) and would leave the restored window unpositioned and invisible.
  const mainExists = !!windows[MAIN_WINDOW_ID];
  const mainGeo = windows[MAIN_WINDOW_ID]?.geo ?? null;
  useLayoutEffect(() => {
    if (!mainExists || mainGeo) return;
    const geo = centeredWindowGeo();
    if (geo) setWindowGeo(MAIN_WINDOW_ID, geo);
  }, [mainExists, mainGeo, setWindowGeo]);

  return (
    <ContextMenu>
      <div ref={ref} data-desktop="" className="relative h-full w-full overflow-hidden">
        {/* Stacked wallpaper layers crossfade on selection. The selected layer
            jumps to the top of the stack and fades in over the previous one
            (which stays opaque beneath until covered), so there's no gradient
            bleed mid-fade in either direction. `isolate` keeps these z-indices
            from escaping above the windows. All are preloaded, so the fade
            never stutters. Empty list → the gradient fallback shows through. */}
        <div className="pointer-events-none absolute inset-0" style={{ isolation: "isolate" }}>
          {WALLPAPERS.length === 0 && (
            <div className="absolute inset-0" style={{ background: wallpaperBackground(null) }} />
          )}
          {WALLPAPERS.map((w, i) => (
            <div
              key={i}
              aria-hidden
              // Screenshot capture composites the active image layer straight
              // onto its canvas (see lib/screenshot), and finds it by this hook.
              data-wallpaper=""
              className="absolute inset-0 transition-opacity duration-slow"
              style={{
                background: wallpaperBackground(w),
                opacity: i === wallpaper ? 1 : 0,
                zIndex: i === wallpaper ? 1 : 0,
              }}
            />
          ))}
        </div>

        {/* Background hit layer: catches right-clicks on empty desktop to open
            the wallpaper menu. Sits behind the windows, so right-clicking a
            window falls through to the window instead. */}
        <ContextMenuTrigger asChild>
          <div className="absolute inset-0" />
        </ContextMenuTrigger>

        {windowOrder.map((id, i) => {
          const win = windows[id];
          if (!win?.geo) return null;
          // Maximized = both side panes collapsed (mirrors useMaximizeContent).
          // Only then does the left edge act as a restore affordance.
          const maximized = win.sidebarCollapsed && win.chatCollapsed;
          return (
            <WindowFrame
              key={id}
              geo={win.geo}
              onChange={(geo) => setWindowGeo(id, geo)}
              onFocus={() => focusWindow(id)}
              bounds={bounds}
              zIndex={i}
              onEdgeRestore={maximized ? () => setMaximized(id, false) : undefined}
            >
              <WindowProvider value={id}>
                <Window />
              </WindowProvider>
            </WindowFrame>
          );
        })}

        {/* Always-on launcher; its Cursor tile relaunches the main window after
            every window has been closed. */}
        <Dock />
      </div>

      <ContextMenuContent>
        <ContextMenuSection>
          <ContextMenuLabel>Wallpaper</ContextMenuLabel>
          <ContextMenuRadioGroup
            value={String(wallpaper)}
            onValueChange={(v) => setWallpaper(Number(v))}
          >
            {WALLPAPERS.map((w, i) => (
              <ContextMenuRadioItem key={i} value={String(i)}>
                {w.label}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuSection>
      </ContextMenuContent>
    </ContextMenu>
  );
}
