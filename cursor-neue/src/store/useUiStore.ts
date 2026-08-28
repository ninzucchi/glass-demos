import { create } from "zustand";
import type { ProjectTemplate } from "@/data/projectTemplates";
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
  /** Prefill for the create dialog when a sidebar placeholder opens it. */
  newProjectDraft: ProjectTemplate | null;
  /** Agents to re-parent after Move to → New Project finishes. */
  pendingMoveAgentIds: string[] | null;
  openNewProject: (windowId: string, draft?: ProjectTemplate) => void;
  closeNewProject: () => void;
  setPendingMoveAgentIds: (ids: string[] | null) => void;
  /** Sidebar suggestion ids the user dismissed in this session. */
  dismissedProjectPlaceholders: string[];
  dismissProjectPlaceholder: (id: string) => void;
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
  newProjectDraft: null,
  pendingMoveAgentIds: null,
  openNewProject: (windowId, draft) =>
    set({ newProjectWindowId: windowId, newProjectDraft: draft ?? null }),
  closeNewProject: () =>
    set({ newProjectWindowId: null, newProjectDraft: null, pendingMoveAgentIds: null }),
  setPendingMoveAgentIds: (ids) => set({ pendingMoveAgentIds: ids }),
  dismissedProjectPlaceholders: [],
  dismissProjectPlaceholder: (id) =>
    set((s) =>
      s.dismissedProjectPlaceholders.includes(id)
        ? s
        : { dismissedProjectPlaceholders: [...s.dismissedProjectPlaceholders, id] },
    ),
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
