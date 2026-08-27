import { create } from "zustand";

interface UiState {
  /** Window id whose Customize modal is open, or null. Scoping to a window (vs a
   *  global boolean) keeps the scrim contained to the triggering window — other
   *  open windows stay untouched. */
  customizeWindowId: string | null;
  openCustomize: (windowId: string) => void;
  closeCustomize: () => void;
  /** Window id whose create-project dialog is open, or null. */
  newProjectWindowId: string | null;
  openNewProject: (windowId: string) => void;
  closeNewProject: () => void;
  /** The composer whose expanded writing surface is open. Scoped to a window
   *  for the same reason as Customize; the agent id says whose text it edits. */
  composerSurface: { windowId: string; agentId: string } | null;
  openComposerSurface: (windowId: string, agentId: string) => void;
  closeComposerSurface: () => void;
  /** Sidebar projects intro card. Hidden by default; the debug Promo toggle
   *  opens it. Get Started and the card close control hide it again. */
  projectsNuxDismissed: boolean;
  dismissProjectsNux: () => void;
  toggleProjectsNux: () => void;
  /** Window id whose projects intro modal is open, or null. */
  projectsIntroWindowId: string | null;
  openProjectsIntro: (windowId: string) => void;
  closeProjectsIntro: () => void;
}

/** Transient, in-memory UI overlay state. Kept separate from appearance
 *  preferences, which are about persisted-style look, not ephemeral open state. */
export const useUiStore = create<UiState>((set) => ({
  customizeWindowId: null,
  openCustomize: (windowId) => set({ customizeWindowId: windowId }),
  closeCustomize: () => set({ customizeWindowId: null }),
  newProjectWindowId: null,
  openNewProject: (windowId) => set({ newProjectWindowId: windowId }),
  closeNewProject: () => set({ newProjectWindowId: null }),
  composerSurface: null,
  openComposerSurface: (windowId, agentId) => set({ composerSurface: { windowId, agentId } }),
  closeComposerSurface: () => set({ composerSurface: null }),
  projectsNuxDismissed: true,
  dismissProjectsNux: () => set({ projectsNuxDismissed: true }),
  toggleProjectsNux: () =>
    set((s) => ({ projectsNuxDismissed: !s.projectsNuxDismissed })),
  projectsIntroWindowId: null,
  openProjectsIntro: (windowId) => set({ projectsIntroWindowId: windowId }),
  closeProjectsIntro: () => set({ projectsIntroWindowId: null }),
}));
