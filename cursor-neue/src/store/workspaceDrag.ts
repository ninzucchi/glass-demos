// Ephemeral UI state for dragging a workspace sidebar row onto the desktop to
// spawn a filtered window. Smaller than `tabDrag`: the only drop decision
// ("released outside a window?") is made once on release, so no drop target is
// tracked mid-drag. Only the floating chip subscribes here.

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

  begin: (source: WorkspaceDragSource, pointer: { x: number; y: number }) => void;
  move: (pointer: { x: number; y: number }) => void;
  end: () => void;
}

export const useWorkspaceDragStore = create<WorkspaceDragState>((set) => ({
  source: null,
  pointer: { x: 0, y: 0 },
  begin: (source, pointer) => set({ source, pointer }),
  move: (pointer) => set({ pointer }),
  end: () => set({ source: null }),
}));
