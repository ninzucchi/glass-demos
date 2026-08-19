import { create } from "zustand";

// Runtime feature flags, toggleable from the dock's settings (Appearance)
// menu. Adding a flag is one FLAG_DEFS entry — the store and the menu pick it
// up automatically. Like useAppearanceStore, deliberately not persisted:
// every load starts on the defaults.
//
// Keep each entry's comment listing the seams the flag controls, so flags
// stay easy to audit and removing one is a single grep.

export const FLAG_DEFS = {
  /** Shared tab sidebars: side-by-side panes (tiles connected through
   *  horizontal splits only) share ONE sidebar per sidebar type — hosted by
   *  the pane nearest the sidebar edge, bound to the group's focused pane,
   *  and toggled for the whole group at once.
   *  Off: every pane hosts, binds, and toggles its own independent sidebar.
   *  Seams: ContentPanel (host/binding computation; off = no bindings map, so
   *  each Tile falls back to its own sidebar) and the toggleTileSidebar
   *  action (group-wide vs single-tile toggle). */
  sharedTabSidebars: { label: "Shared tab sidebars", default: true },
} as const satisfies Record<string, { label: string; default: boolean }>;

export type FeatureFlag = keyof typeof FLAG_DEFS;

interface FeatureFlagState {
  flags: Record<FeatureFlag, boolean>;
  toggleFlag: (flag: FeatureFlag) => void;
}

export const useFeatureFlags = create<FeatureFlagState>((set) => ({
  flags: Object.fromEntries(
    Object.entries(FLAG_DEFS).map(([flag, def]) => [flag, def.default]),
  ) as Record<FeatureFlag, boolean>,
  toggleFlag: (flag) => set((s) => ({ flags: { ...s.flags, [flag]: !s.flags[flag] } })),
}));

/** Flag value outside React (store actions); components subscribe instead. */
export const flagEnabled = (flag: FeatureFlag): boolean =>
  useFeatureFlags.getState().flags[flag];
