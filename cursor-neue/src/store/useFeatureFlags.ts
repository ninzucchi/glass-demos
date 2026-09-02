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
 *  - Folders: always expandable. The body lists every child agent, first
 *    three plus a More row, or all four when a fifth would not exist.
 *    Elevation still exists; it does not gate the list.
 *  - Focus Folders: project folders nest elevated children only. X demotes
 *    even if the agent is unread or working. No chevron when empty.
 *    Repo folders stay regular folders and list every child.
 *  - Agents: project rows act like agents; they keep the colored leading icon.
 */
export const PROJECT_FOLDERS_MODES = ["folders", "focus", "agents"] as const;
export type ProjectFoldersMode = (typeof PROJECT_FOLDERS_MODES)[number];

export const PROJECT_FOLDERS_LABEL: Record<ProjectFoldersMode, string> = {
  folders: "Folders",
  focus: "Focus Folders",
  agents: "Agents",
};

/** Whether a project row can expand and list children in the sidebar. */
export function projectFolderCollapsible(
  mode: ProjectFoldersMode,
  elevatedCount: number,
): boolean {
  switch (mode) {
    case "folders":
      return true;
    case "focus":
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

/**
 * Ticket and mention codes in the project document.
 *  - Off: task titles and agent names only.
 *  - IDs: each task starts with a gray `#XX-N` mark. Agent names get `@`.
 */
export const DOC_IDS_MODES = ["off", "ids"] as const;
export type DocIdsMode = (typeof DOC_IDS_MODES)[number];

export const DOC_IDS_LABEL: Record<DocIdsMode, string> = {
  off: "Off",
  ids: "IDs",
};

/**
 * Subagent titles for project children.
 *  - Off: task-based seed names (Focus Trap, Composer Tabs).
 *  - Names: stars, constellations, and solar-system moons.
 */
export const AGENT_NAMES_MODES = ["off", "names"] as const;
export type AgentNamesMode = (typeof AGENT_NAMES_MODES)[number];

export const AGENT_NAMES_LABEL: Record<AgentNamesMode, string> = {
  off: "Off",
  names: "Names",
};

interface FeatureFlagState {
  flags: Record<FeatureFlag, boolean>;
  /** Dedicated Projects section vs one Chats list. Default is Merged. */
  sidebarSections: SidebarSectionsMode;
  /** Project folder chrome. Default is Folders (all children). */
  projectFolders: ProjectFoldersMode;
  /** Project board surfaces. Default is Tasks. */
  projectSurface: ProjectSurfaceMode;
  /** Linear-style IDs and @mentions in the project document. Default is Off. */
  docIds: DocIdsMode;
  /** Celestial names for project subagents. Default is Off. */
  agentNames: AgentNamesMode;
  toggleFlag: (flag: FeatureFlag) => void;
  setSidebarSections: (mode: SidebarSectionsMode) => void;
  setProjectFolders: (mode: ProjectFoldersMode) => void;
  setProjectSurface: (mode: ProjectSurfaceMode) => void;
  setDocIds: (mode: DocIdsMode) => void;
  setAgentNames: (mode: AgentNamesMode) => void;
}

export const useFeatureFlags = create<FeatureFlagState>((set) => ({
  flags: Object.fromEntries(
    Object.entries(FLAG_DEFS).map(([flag, def]) => [flag, def.default]),
  ),
  sidebarSections: "two",
  projectFolders: "focus",
  projectSurface: "tasks",
  docIds: "off",
  agentNames: "off",
  toggleFlag: (flag) => set((s) => ({ flags: { ...s.flags, [flag]: !s.flags[flag] } })),
  setSidebarSections: (sidebarSections) => set({ sidebarSections }),
  setProjectFolders: (projectFolders) => set({ projectFolders }),
  setProjectSurface: (projectSurface) => set({ projectSurface }),
  setDocIds: (docIds) => set({ docIds }),
  setAgentNames: (agentNames) => set({ agentNames }),
}));

/** Flag value outside React (store actions); components subscribe instead. */
export const flagEnabled = (flag: FeatureFlag): boolean =>
  useFeatureFlags.getState().flags[flag];

/** Merged sidebar: one Chats list, no Projects section, no "Project" copy. */
export const sidebarIsMerged = (): boolean =>
  useFeatureFlags.getState().sidebarSections === "one";

export const useMergedSidebar = (): boolean =>
  useFeatureFlags((s) => s.sidebarSections) === "one";
