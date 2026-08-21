// Demo configuration knobs set in code (not via UI).
import wallpaper0 from "@/assets/bg.png";
import wallpaper1 from "@/assets/1.jpg";

// A desktop wallpaper choice: either a bundled image or a solid CSS color.
export type Wallpaper =
  | { kind: "image"; label: string; src: string }
  | { kind: "color"; label: string; color: string };

// Desktop wallpapers, chosen at runtime via the desktop right-click menu (not
// tied to theme). Image entries are bundled assets from src/assets (hashed +
// build-time validated); color entries are any CSS color. Add/remove entries to
// change the choices; an empty list falls back to the theme-aware gradient
// defined by --desktop-bg in tokens.css.
export const WALLPAPERS: Wallpaper[] = [
  { kind: "image", label: "Wallpaper 1", src: wallpaper0 },
  { kind: "image", label: "Wallpaper 2", src: wallpaper1 },
  { kind: "color", label: "Eggshell", color: "#f2f2f2" },
  { kind: "color", label: "Black", color: "#000000" },
];
