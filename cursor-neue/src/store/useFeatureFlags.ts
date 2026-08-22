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

/**
 * One experiment, many treatments. The bottom DebugBar writes this flag.
 * Add a mode to the array — do not add a second flag for the next option.
 *
 * Seams:
 *  - Sidebar: Projects section vs project folders inside Chats (`Sidebar.tsx`)
 */
export const SIDEBAR_PROJECTS_MODES = ["off", "flat"] as const;
export type SidebarProjectsMode = (typeof SIDEBAR_PROJECTS_MODES)[number];

export const SIDEBAR_PROJECTS_LABEL: Record<SidebarProjectsMode, string> = {
  off: "Today",
  flat: "Flat",
};

interface FeatureFlagState {
  flags: Record<FeatureFlag, boolean>;
  /** Treatments for the sidebar-projects experiment. Default is today's layout. */
  sidebarProjects: SidebarProjectsMode;
  toggleFlag: (flag: FeatureFlag) => void;
  setSidebarProjects: (mode: SidebarProjectsMode) => void;
}

export const useFeatureFlags = create<FeatureFlagState>((set) => ({
  flags: Object.fromEntries(
    Object.entries(FLAG_DEFS).map(([flag, def]) => [flag, def.default]),
  ),
  sidebarProjects: "off",
  toggleFlag: (flag) => set((s) => ({ flags: { ...s.flags, [flag]: !s.flags[flag] } })),
  setSidebarProjects: (sidebarProjects) => set({ sidebarProjects }),
}));

/** Flag value outside React (store actions); components subscribe instead. */
export const flagEnabled = (flag: FeatureFlag): boolean =>
  useFeatureFlags.getState().flags[flag];

export const sidebarProjectsMode = (): SidebarProjectsMode =>
  useFeatureFlags.getState().sidebarProjects;
