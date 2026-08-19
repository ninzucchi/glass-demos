import { create } from "zustand";

interface UiState {
  /** Window id whose Customize modal is open, or null. Scoping to a window (vs a
   *  global boolean) keeps the scrim contained to the triggering window — other
   *  open windows stay untouched. */
  customizeWindowId: string | null;
  openCustomize: (windowId: string) => void;
  closeCustomize: () => void;
  /** The composer whose expanded writing surface is open. Scoped to a window
   *  for the same reason as Customize; the agent id says whose text it edits. */
  composerSurface: { windowId: string; agentId: string } | null;
  openComposerSurface: (windowId: string, agentId: string) => void;
  closeComposerSurface: () => void;
}

/** Transient, in-memory UI overlay state. Kept separate from appearance
 *  preferences, which are about persisted-style look, not ephemeral open state. */
export const useUiStore = create<UiState>((set) => ({
  customizeWindowId: null,
  openCustomize: (windowId) => set({ customizeWindowId: windowId }),
  closeCustomize: () => set({ customizeWindowId: null }),
  composerSurface: null,
  openComposerSurface: (windowId, agentId) => set({ composerSurface: { windowId, agentId } }),
  closeComposerSurface: () => set({ composerSurface: null }),
}));
