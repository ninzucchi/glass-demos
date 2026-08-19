import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSection,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { TILE_BTN } from "@/components/desktop/dockTile";
import {
  desktopSize,
  fitToDesktopGeo,
  resizeAroundCenter,
  SIZE_PRESETS,
  type SizePreset,
} from "@/components/desktop/geometry";
import { type Theme, useAppearanceStore } from "@/store/useAppearanceStore";
import { FLAG_DEFS, useFeatureFlags, type FeatureFlag } from "@/store/useFeatureFlags";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Preset sizes for the front-most window, checked when its geometry already
 *  matches. Rendered inside the menu content (mounted only while open), so the
 *  desktop is measured fresh on each open — the once-per-mount read is enough
 *  because a mid-open viewport resize can't happen without closing the menu. */
function WindowSizeSection() {
  const [desk] = useState(desktopSize);
  const geo = useWorkspaceStore((s) => {
    const id = s.windowOrder[s.windowOrder.length - 1];
    return (id ? s.windows[id]?.geo : null) ?? null;
  });
  const setWindowGeo = useWorkspaceStore((s) => s.setWindowGeo);

  const active = SIZE_PRESETS.find((p) => geo?.w === p.w && geo?.h === p.h);
  const fits = (p: SizePreset) => !!desk && p.w <= desk.w && p.h <= desk.h;

  const apply = (preset: SizePreset) => {
    const { windowOrder, windows } = useWorkspaceStore.getState();
    const id = windowOrder[windowOrder.length - 1];
    const current = id ? windows[id]?.geo : null;
    if (!id || !current) return;
    const next = resizeAroundCenter(current, preset.w, preset.h);
    if (next) setWindowGeo(id, next);
  };

  return (
    <DropdownMenuSection>
      <DropdownMenuLabel>Window size</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={active?.id ?? ""}
        onValueChange={(v) => {
          const preset = SIZE_PRESETS.find((p) => p.id === v);
          if (preset) apply(preset);
        }}
      >
        {SIZE_PRESETS.map((preset) => (
          <DropdownMenuRadioItem
            key={preset.id}
            value={preset.id}
            // A preset larger than the desktop would be clipped by it, so offer
            // it disabled instead of quietly resizing to something else.
            disabled={!geo || !fits(preset)}
            title={fits(preset) ? undefined : "Larger than the current screen"}
          >
            {/* Fixed-width row rather than flex-1: the check only renders on
                the active preset, so a growing row would shift its dimensions
                column out of line with the rest. */}
            <span className="flex min-w-[140px] items-center justify-between gap-6">
              <span>{preset.label}</span>
              <span className="text-tertiary tabular-nums">
                {preset.w} × {preset.h}
              </span>
            </span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuSection>
  );
}

/** The dock's gear tile: opens a settings menu — theme, feature flags, and
 *  window actions (preset sizes, fit to screen, reset demo). Sidebar placement
 *  moved to the tile sidebar toggle's right-click menu. Owns no layout of its
 *  own beyond the shared dock-tile trigger; all state lives in the
 *  appearance/workspace stores. */
export function AppearanceMenu() {
  const theme = useAppearanceStore((s) => s.theme);
  const setTheme = useAppearanceStore((s) => s.setTheme);
  const reset = useWorkspaceStore((s) => s.reset);
  const setWindowGeo = useWorkspaceStore((s) => s.setWindowGeo);
  const flags = useFeatureFlags((s) => s.flags);
  const toggleFlag = useFeatureFlags((s) => s.toggleFlag);

  // Snap the front-most window to fill the desktop, insetting for the dock on
  // the left so it doesn't sit behind it (padding defaults handle the rest).
  const fitWindowToScreen = () => {
    const { windowOrder } = useWorkspaceStore.getState();
    const id = windowOrder[windowOrder.length - 1];
    const geo = fitToDesktopGeo();
    if (id && geo) setWindowGeo(id, geo);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Appearance"
          className={`${TILE_BTN} bg-luminous-secondary data-[state=open]:translate-x-0 data-[state=open]:hover:translate-x-0`}
        >
          <Icon name="sliders" size="lg" color="luminous" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="right">
        <DropdownMenuSection>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(v) => setTheme(v as Theme)}
          >
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSection>
        <DropdownMenuSeparator />
        <DropdownMenuSection>
          <DropdownMenuLabel>Feature flags</DropdownMenuLabel>
          {(Object.keys(FLAG_DEFS) as FeatureFlag[]).map((flag) => (
            <DropdownMenuCheckboxItem
              key={flag}
              checked={flags[flag]}
              onCheckedChange={() => toggleFlag(flag)}
              // Keep the menu open: flag flips are often toggled back-to-back
              // while comparing behaviors.
              onSelect={(e) => e.preventDefault()}
            >
              {FLAG_DEFS[flag].label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuSection>
        <DropdownMenuSeparator />
        <WindowSizeSection />
        <DropdownMenuSeparator />
        <DropdownMenuSection>
          <DropdownMenuItem onSelect={fitWindowToScreen}>
            <Icon name="window" size="base" color="tertiary" />
            Fit window to screen
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => reset()}>
            <Icon name="arrow-ccw" size="base" color="tertiary" />
            Reset demo
          </DropdownMenuItem>
        </DropdownMenuSection>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
