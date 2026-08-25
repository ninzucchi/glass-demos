// Ephemeral UI state for dragging a workspace sidebar row: reorder in the
// folder list, or release on the desktop to spawn a filtered window. The chip
// follows `pointer`; `overIndex` is the live insertion slot.

import { create } from "zustand";

export interface WorkspaceDragSource {
  workspaceId: string;
  label: string;
}

interface WorkspaceDragState {
  // The workspace being dragged, or null when no drag is in progress.
  source: WorkspaceDragSource | null;
  // Live cursor position, used to position the floating drag chip.
  pointer: { x: number; y: number };
  /** Preview slot in the workspace list. Null when not over the list. */
  overIndex: number | null;

  begin: (source: WorkspaceDragSource, pointer: { x: number; y: number }) => void;
  move: (pointer: { x: number; y: number }) => void;
  setOverIndex: (overIndex: number | null) => void;
  end: () => void;
}

export const useWorkspaceDragStore = create<WorkspaceDragState>((set) => ({
  source: null,
  pointer: { x: 0, y: 0 },
  overIndex: null,
  begin: (source, pointer) => set({ source, pointer, overIndex: null }),
  move: (pointer) => set({ pointer }),
  setOverIndex: (overIndex) => set((s) => (s.overIndex === overIndex ? s : { overIndex })),
  end: () => set({ source: null, overIndex: null }),
}));
