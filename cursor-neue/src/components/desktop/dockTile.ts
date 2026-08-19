// Shared dock-tile styling. Lives apart from Dock so the dock bar and its tile
// contents (e.g. AppearanceMenu) can share it without a circular import.

// Base tile: 44px rounded square with a hairline border + inset top highlight.
export const TILE =
  "relative size-11 shrink-0 rounded-[11px] border border-[color:var(--bg-luminous-quaternary)] " +
  "shadow-[inset_0_1px_1px_0_var(--bg-luminous-tertiary)]";

// Interactive tile: TILE + glyph centering + the shared lift-on-hover motion,
// which nudges away from the desktop edge the dock sits on (left).
export const TILE_BTN =
  `${TILE} flex items-center justify-center transition-transform duration-fast ` +
  "hover:translate-x-0.5 active:translate-x-0";
