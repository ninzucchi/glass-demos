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
 * Where projects sit in the sidebar.
 *  - Separate: dedicated Projects section, above repos and recents.
 *  - Merged: no Projects section. Projects sit in the Chats list and follow
 *    workspace or recents grouping like agents.
 */
export const SIDEBAR_SECTIONS_MODES = ["two", "one"] as const;
export type SidebarSectionsMode = (typeof SIDEBAR_SECTIONS_MODES)[number];

export const SIDEBAR_SECTIONS_LABEL: Record<SidebarSectionsMode, string> = {
  two: "Separate",
  one: "Merged",
};

/**
 * Project chrome in the sidebar.
 *  - Folders: nest elevated children. Send a message or pin a temp tab to
 *    elevate; X demotes. No chevron when the project has no elevated children.
 *  - Agents: project rows act like agents; they keep the colored leading icon.
 */
export const PROJECT_FOLDERS_MODES = ["folders", "agents"] as const;
export type ProjectFoldersMode = (typeof PROJECT_FOLDERS_MODES)[number];

export const PROJECT_FOLDERS_LABEL: Record<ProjectFoldersMode, string> = {
  folders: "Folders",
  agents: "Agents",
};

/** Whether a project row can expand and list children in the sidebar. */
export function projectFolderCollapsible(
  mode: ProjectFoldersMode,
  elevatedCount: number,
): boolean {
  switch (mode) {
    case "folders":
      return elevatedCount > 0;
    case "agents":
      return false;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/**
 * Extra chat tabs opened beside a project.
 *  - Tabs: one italic temporary slot; a later agent replaces it until the
 *    user double-clicks to keep the tab.
 *  - Crumbs: no tab bar. The header is a breadcrumb; a child rewrites the
 *    current chat. Parent crumb, Back pill, and mouse back/forward pop one
 *    level.
 */
export const EPHEMERAL_TABS_MODES = ["tabs", "crumbs"] as const;
export type EphemeralTabsMode = (typeof EPHEMERAL_TABS_MODES)[number];

export const EPHEMERAL_TABS_LABEL: Record<EphemeralTabsMode, string> = {
  tabs: "Tabs",
  crumbs: "Crumbs",
};

/**
 * Create-project dialog.
 *  - Modal: compact form. Model and Create sit in the footer.
 *  - Advanced: larger form. Model is a labeled select. Templates sit below a rule.
 *  - Suggestions: checkbox list of For You + Templates. Custom opens Modal.
 *  - Composer: plus opens a New Project empty chat (same shell as New Agent).
 */
export const PROJECT_CREATE_MODES = ["modal", "advanced", "suggestions", "composer"] as const;
export type ProjectCreateMode = (typeof PROJECT_CREATE_MODES)[number];

export const PROJECT_CREATE_LABEL: Record<ProjectCreateMode, string> = {
  modal: "Modal",
  advanced: "Advanced",
  suggestions: "Suggestions",
  composer: "Composer",
};

/**
 * Seeded projects vs empty onboarding.
 *  - Off: three seed projects. The user is already onboarded.
 *  - New: no seed projects. Four suggestion placeholders in the sidebar.
 */
export const PROJECT_ONBOARDING_MODES = ["off", "new"] as const;
export type ProjectOnboardingMode = (typeof PROJECT_ONBOARDING_MODES)[number];

export const PROJECT_ONBOARDING_LABEL: Record<ProjectOnboardingMode, string> = {
  off: "Off",
  new: "New",
};

/**
 * 2D canvas on the project board.
 *  - Off: columns and rows only. The map control is hidden.
 *  - Map: the layout selector includes the canvas view.
 */
export const PROJECT_MAP_MODES = ["off", "map"] as const;
export type ProjectMapMode = (typeof PROJECT_MAP_MODES)[number];

export const PROJECT_MAP_LABEL: Record<ProjectMapMode, string> = {
  off: "Off",
  map: "Map",
};

/**
 * Surfaces on the project right panel.
 *  - All: Tasks / Agents / PRs segmented control.
 *  - Tasks: tasks only. The control is replaced by the project title.
 */
export const PROJECT_SURFACE_MODES = ["all", "tasks"] as const;
export type ProjectSurfaceMode = (typeof PROJECT_SURFACE_MODES)[number];

export const PROJECT_SURFACE_LABEL: Record<ProjectSurfaceMode, string> = {
  all: "All",
  tasks: "Tasks",
};

interface FeatureFlagState {
  flags: Record<FeatureFlag, boolean>;
  /** Dedicated Projects section vs one Chats list. Default is Two. */
  sidebarSections: SidebarSectionsMode;
  /** Project folder chrome. Default is Agents. */
  projectFolders: ProjectFoldersMode;
  /** Extra project tabs. Default is Tabs. */
  ephemeralTabs: EphemeralTabsMode;
  /** Create-project dialog. Default is Modal. */
  projectCreate: ProjectCreateMode;
  /** Seeded projects vs empty onboarding. Default is Off. */
  projectOnboarding: ProjectOnboardingMode;
  /** Project board canvas. Default is Off. */
  projectMap: ProjectMapMode;
  /** Project board surfaces. Default is All. */
  projectSurface: ProjectSurfaceMode;
  toggleFlag: (flag: FeatureFlag) => void;
  setSidebarSections: (mode: SidebarSectionsMode) => void;
  setProjectFolders: (mode: ProjectFoldersMode) => void;
  setEphemeralTabs: (mode: EphemeralTabsMode) => void;
  setProjectCreate: (mode: ProjectCreateMode) => void;
  setProjectOnboarding: (mode: ProjectOnboardingMode) => void;
  setProjectMap: (mode: ProjectMapMode) => void;
  setProjectSurface: (mode: ProjectSurfaceMode) => void;
}

export const useFeatureFlags = create<FeatureFlagState>((set) => ({
  flags: Object.fromEntries(
    Object.entries(FLAG_DEFS).map(([flag, def]) => [flag, def.default]),
  ),
  sidebarSections: "two",
  projectFolders: "agents",
  ephemeralTabs: "tabs",
  projectCreate: "modal",
  projectOnboarding: "off",
  projectMap: "off",
  projectSurface: "all",
  toggleFlag: (flag) => set((s) => ({ flags: { ...s.flags, [flag]: !s.flags[flag] } })),
  setSidebarSections: (sidebarSections) => set({ sidebarSections }),
  setProjectFolders: (projectFolders) => set({ projectFolders }),
  setEphemeralTabs: (ephemeralTabs) => set({ ephemeralTabs }),
  setProjectCreate: (projectCreate) => set({ projectCreate }),
  setProjectOnboarding: (projectOnboarding) => set({ projectOnboarding }),
  setProjectMap: (projectMap) => set({ projectMap }),
  setProjectSurface: (projectSurface) => set({ projectSurface }),
}));

/** Flag value outside React (store actions); components subscribe instead. */
export const flagEnabled = (flag: FeatureFlag): boolean =>
  useFeatureFlags.getState().flags[flag];
