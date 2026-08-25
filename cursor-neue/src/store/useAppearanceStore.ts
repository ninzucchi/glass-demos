import { create } from "zustand";

export type Theme = "light" | "dark";
export type SidebarPlacement = "left" | "right";

interface AppearanceState {
  theme: Theme;
  sidebarPlacement: SidebarPlacement;
  /** Index into config's WALLPAPERS; independent of theme. */
  wallpaper: number;
  setTheme: (theme: Theme) => void;
  setSidebarPlacement: (placement: SidebarPlacement) => void;
  setWallpaper: (index: number) => void;
}

/** Global, in-memory appearance preferences (theme, per-tab sidebar placement,
 *  and desktop wallpaper). Deliberately not persisted: every load starts fresh
 *  in light / left, which also sidesteps any reload theme flash. */
export const useAppearanceStore = create<AppearanceState>((set) => ({
  theme: "light",
  sidebarPlacement: "left",
  wallpaper: 0,
  setTheme: (theme) => set({ theme }),
  setSidebarPlacement: (sidebarPlacement) => set({ sidebarPlacement }),
  setWallpaper: (wallpaper) => set({ wallpaper }),
}));
