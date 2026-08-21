import { create } from "zustand";

// Runtime feature flags, toggleable from the dock's settings menu. Adding a
// flag is one FLAG_DEFS entry — the store and the menu pick it up automatically.
// Like useAppearanceStore, deliberately not persisted: every load starts on
// the defaults.
//
// Keep each entry's comment listing the seams the flag controls, so flags
// stay easy to audit and removing one is a single grep.

export type FlagDef = { label: string; default: boolean };

export const FLAG_DEFS: Record<string, FlagDef> = {};

export type FeatureFlag = string;

interface FeatureFlagState {
  flags: Record<FeatureFlag, boolean>;
  toggleFlag: (flag: FeatureFlag) => void;
}

export const useFeatureFlags = create<FeatureFlagState>((set) => ({
  flags: Object.fromEntries(
    Object.entries(FLAG_DEFS).map(([flag, def]) => [flag, def.default]),
  ),
  toggleFlag: (flag) => set((s) => ({ flags: { ...s.flags, [flag]: !s.flags[flag] } })),
}));

/** Flag value outside React (store actions); components subscribe instead. */
export const flagEnabled = (flag: FeatureFlag): boolean =>
  useFeatureFlags.getState().flags[flag];
