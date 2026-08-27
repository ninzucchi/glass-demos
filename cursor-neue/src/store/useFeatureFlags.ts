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
 *  - Sidebar chrome: Today nests Pinned under Chats; Merged lifts Pinned and
 *    drops the Chats header (`Sidebar.tsx`)
 */
export const SIDEBAR_PROJECTS_MODES = ["off", "merged"] as const;
export type SidebarProjectsMode = (typeof SIDEBAR_PROJECTS_MODES)[number];

export const SIDEBAR_PROJECTS_LABEL: Record<SidebarProjectsMode, string> = {
  off: "Off",
  merged: "Merged",
};

/**
 * Project folder chrome in the sidebar.
 *  - Off: hover chevron, nested agents, plus-to-create.
 *  - Compressed: project rows act like agents; they keep the colored leading icon.
 */
export const PROJECT_FOLDERS_MODES = ["off", "compressed"] as const;
export type ProjectFoldersMode = (typeof PROJECT_FOLDERS_MODES)[number];

export const PROJECT_FOLDERS_LABEL: Record<ProjectFoldersMode, string> = {
  off: "Off",
  compressed: "Compressed",
};

/**
 * Extra chat tabs opened beside a project.
 *  - Off: every new tab is permanent.
 *  - Temp: one italic temporary slot; a later agent replaces it until the
 *    user double-clicks to keep the tab.
 *  - Crumbs: no tab bar. The header is a breadcrumb; a child rewrites the
 *    current chat. Parent crumb, Back pill, and mouse back/forward pop one
 *    level.
 */
export const EPHEMERAL_TABS_MODES = ["off", "ephemeral", "crumbs"] as const;
export type EphemeralTabsMode = (typeof EPHEMERAL_TABS_MODES)[number];

export const EPHEMERAL_TABS_LABEL: Record<EphemeralTabsMode, string> = {
  off: "Off",
  ephemeral: "Temp",
  crumbs: "Crumbs",
};

/**
 * Project icon chrome in the sidebar leading slot.
 *  - Off: colored glyph only.
 *  - Square: glyph on a rounded well tinted with the project color. Radius
 *    stays concentric with the row hover.
 *  - Circle: same well as a circle; glyph shrinks 2px so it fits.
 */
export const PROJECT_ICON_SHAPE_MODES = ["off", "square", "circle"] as const;
export type ProjectIconShapeMode = (typeof PROJECT_ICON_SHAPE_MODES)[number];

export const PROJECT_ICON_SHAPE_LABEL: Record<ProjectIconShapeMode, string> = {
  off: "Off",
  square: "Square",
  circle: "Circle",
};

/**
 * Create-project dialog.
 *  - Modal: compact form. Model and Create sit in the footer.
 *  - Rich: larger form. Model is a labeled select. Templates sit below a rule.
 *  - Suggestions: checkbox list of For You + Templates. Custom opens Modal.
 */
export const PROJECT_CREATE_MODES = ["modal", "rich", "suggestions"] as const;
export type ProjectCreateMode = (typeof PROJECT_CREATE_MODES)[number];

export const PROJECT_CREATE_LABEL: Record<ProjectCreateMode, string> = {
  modal: "Modal",
  rich: "Rich",
  suggestions: "Suggestions",
};

interface FeatureFlagState {
  flags: Record<FeatureFlag, boolean>;
  /** Treatments for the sidebar-projects experiment. Default is Merged. */
  sidebarProjects: SidebarProjectsMode;
  /** Project folder chrome. Default is Compressed. */
  projectFolders: ProjectFoldersMode;
  /** Extra project tabs. Default is Crumbs. */
  ephemeralTabs: EphemeralTabsMode;
  /** Sidebar project icon well. Default is Off. */
  projectIconShape: ProjectIconShapeMode;
  /** Create-project dialog. Default is Modal. */
  projectCreate: ProjectCreateMode;
  toggleFlag: (flag: FeatureFlag) => void;
  setSidebarProjects: (mode: SidebarProjectsMode) => void;
  setProjectFolders: (mode: ProjectFoldersMode) => void;
  setEphemeralTabs: (mode: EphemeralTabsMode) => void;
  setProjectIconShape: (mode: ProjectIconShapeMode) => void;
  setProjectCreate: (mode: ProjectCreateMode) => void;
}

export const useFeatureFlags = create<FeatureFlagState>((set) => ({
  flags: Object.fromEntries(
    Object.entries(FLAG_DEFS).map(([flag, def]) => [flag, def.default]),
  ),
  sidebarProjects: "merged",
  projectFolders: "compressed",
  ephemeralTabs: "crumbs",
  projectIconShape: "off",
  projectCreate: "modal",
  toggleFlag: (flag) => set((s) => ({ flags: { ...s.flags, [flag]: !s.flags[flag] } })),
  setSidebarProjects: (sidebarProjects) => set({ sidebarProjects }),
  setProjectFolders: (projectFolders) => set({ projectFolders }),
  setEphemeralTabs: (ephemeralTabs) => set({ ephemeralTabs }),
  setProjectIconShape: (projectIconShape) => set({ projectIconShape }),
  setProjectCreate: (projectCreate) => set({ projectCreate }),
}));

/** Flag value outside React (store actions); components subscribe instead. */
export const flagEnabled = (flag: FeatureFlag): boolean =>
  useFeatureFlags.getState().flags[flag];

export const sidebarProjectsMode = (): SidebarProjectsMode =>
  useFeatureFlags.getState().sidebarProjects;
