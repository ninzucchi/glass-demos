import { WALLPAPERS, type Wallpaper } from "@/config";

// CSS `background` shorthand for a wallpaper, or the gradient fallback when
// there is none.
export function wallpaperBackground(wallpaper: Wallpaper | null): string {
  if (!wallpaper) return "var(--desktop-bg)";
  if (wallpaper.kind === "color") return wallpaper.color;
  return `center / cover no-repeat url("${wallpaper.src}")`;
}

// Fetch + decode every image wallpaper once so switching paints the new
// background instantly instead of waiting on a cold image load. Color
// wallpapers need no preloading.
export function preloadWallpapers(): void {
  for (const wallpaper of WALLPAPERS) {
    if (wallpaper.kind !== "image") continue;
    const img = new Image();
    img.src = wallpaper.src;
    void img.decode?.().catch(() => {});
  }
}
