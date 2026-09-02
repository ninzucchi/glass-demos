import { create } from "zustand";
import { JOIN_PULSE_MS } from "@/lib/projectJoinNotice";

export interface SidebarAgentSelection {
  ids: string[];
  /** Last clicked agent; Shift+click ranges from here. */
  anchorId: string | null;
}

interface UiState {
  /** Window id whose Customize modal is open, or null. Scoping to a window (vs a
   *  global boolean) keeps the scrim contained to the triggering window — other
   *  open windows stay untouched. */
  customizeWindowId: string | null;
  openCustomize: (windowId: string) => void;
  closeCustomize: () => void;
  /** Window id whose create-project dialog is open, or null. */
  newProjectWindowId: string | null;
  /** Existing project the dialog is editing, or null for create. */
  editingProjectId: string | null;
  /** Agents to re-parent after Move to → New Project finishes. */
  pendingMoveAgentIds: string[] | null;
  openNewProject: (windowId: string) => void;
  openEditProject: (windowId: string, projectId: string) => void;
  closeNewProject: () => void;
  setPendingMoveAgentIds: (ids: string[] | null) => void;
  /** The composer whose expanded writing surface is open. Scoped to a window
   *  for the same reason as Customize; the agent id says whose text it edits. */
  composerSurface: { windowId: string; agentId: string } | null;
  openComposerSurface: (windowId: string, agentId: string) => void;
  closeComposerSurface: () => void;
  /** Sidebar agent multi-select, per window. Empty ids means "highlight the
   *  active agent only". Modifier clicks update this without changing the
   *  open transcript. */
  sidebarAgentSelection: Record<string, SidebarAgentSelection>;
  setSidebarAgentSelection: (windowId: string, next: SidebarAgentSelection) => void;
  /** Active surface on the project board (Tasks / Agents / PRs). */
  projectBoardSurface: "tasks" | "agents" | "prs";
  setProjectBoardSurface: (surface: "tasks" | "agents" | "prs") => void;
  /** Board layout. Lives here so leaving the Tracker tab does not reset it. */
  projectBoardView: "columns" | "rows" | "doc" | "map";
  setProjectBoardView: (view: "columns" | "rows" | "doc" | "map") => void;
  /** Composer follow-up tray on a project chat (Agents / PRs). */
  projectFollowUpTray: "prs" | "subagents" | null;
  setProjectFollowUpTray: (tray: "prs" | "subagents" | null) => void;
  /** Agent ids that just joined a project, keyed by start time for the wash. */
  joinedAgentPulseAt: Record<string, number>;
  pulseJoinedAgents: (ids: string[]) => void;
}

/** Transient, in-memory UI overlay state. Kept separate from appearance
 *  preferences, which are about persisted-style look, not ephemeral open state. */
export const useUiStore = create<UiState>((set) => ({
  customizeWindowId: null,
  openCustomize: (windowId) => set({ customizeWindowId: windowId }),
  closeCustomize: () => set({ customizeWindowId: null }),
  newProjectWindowId: null,
  editingProjectId: null,
  pendingMoveAgentIds: null,
  openNewProject: (windowId) =>
    set({
      newProjectWindowId: windowId,
      editingProjectId: null,
    }),
  openEditProject: (windowId, projectId) =>
    set({
      newProjectWindowId: windowId,
      editingProjectId: projectId,
    }),
  closeNewProject: () =>
    set({
      newProjectWindowId: null,
      editingProjectId: null,
      pendingMoveAgentIds: null,
    }),
  setPendingMoveAgentIds: (ids) => set({ pendingMoveAgentIds: ids }),
  composerSurface: null,
  openComposerSurface: (windowId, agentId) => set({ composerSurface: { windowId, agentId } }),
  closeComposerSurface: () => set({ composerSurface: null }),
  sidebarAgentSelection: {},
  setSidebarAgentSelection: (windowId, next) =>
    set((s) => ({
      sidebarAgentSelection: { ...s.sidebarAgentSelection, [windowId]: next },
    })),
  projectBoardSurface: "tasks",
  setProjectBoardSurface: (surface) => set({ projectBoardSurface: surface }),
  projectBoardView: "columns",
  setProjectBoardView: (view) => set({ projectBoardView: view }),
  projectFollowUpTray: null,
  setProjectFollowUpTray: (tray) => set({ projectFollowUpTray: tray }),
  joinedAgentPulseAt: {},
  pulseJoinedAgents: (ids) => {
    if (ids.length === 0) return;
    const startedAt = Date.now();
    set((s) => {
      const next = { ...s.joinedAgentPulseAt };
      for (const id of ids) next[id] = startedAt;
      return { joinedAgentPulseAt: next };
    });
    window.setTimeout(() => {
      set((s) => {
        const next = { ...s.joinedAgentPulseAt };
        let changed = false;
        for (const id of ids) {
          if (next[id] === startedAt) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? { joinedAgentPulseAt: next } : s;
      });
    }, JOIN_PULSE_MS);
  },
}));
