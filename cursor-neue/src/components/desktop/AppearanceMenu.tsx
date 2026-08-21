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
import { type Theme, useAppearanceStore } from "@/store/useAppearanceStore";
import { FLAG_DEFS, useFeatureFlags, type FeatureFlag } from "@/store/useFeatureFlags";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const FLAG_KEYS = Object.keys(FLAG_DEFS) as FeatureFlag[];

/** The dock's gear tile: opens a settings menu — theme, feature flags (when
 *  any are defined), and reset demo. Sidebar placement moved to the tile
 *  sidebar toggle's right-click menu. Owns no layout of its own beyond the
 *  shared dock-tile trigger; all state lives in the appearance/workspace stores. */
export function AppearanceMenu() {
  const theme = useAppearanceStore((s) => s.theme);
  const setTheme = useAppearanceStore((s) => s.setTheme);
  const reset = useWorkspaceStore((s) => s.reset);
  const flags = useFeatureFlags((s) => s.flags);
  const toggleFlag = useFeatureFlags((s) => s.toggleFlag);

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
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(v) => setTheme(v as Theme)}
          >
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSection>
        {FLAG_KEYS.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSection>
              <DropdownMenuLabel>Feature flags</DropdownMenuLabel>
              {FLAG_KEYS.map((flag) => (
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
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSection>
          <DropdownMenuItem onSelect={() => reset()}>
            <Icon name="arrow-ccw" size="base" color="tertiary" />
            Reset demo
          </DropdownMenuItem>
        </DropdownMenuSection>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
