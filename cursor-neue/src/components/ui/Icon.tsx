import clsx from "clsx";
import type { CSSProperties } from "react";
import type { IconName } from "@/icons/iconNames";

export type { IconName };

export type IconColor = "primary" | "secondary" | "tertiary" | "quaternary" | "luminous" | "inherit";
export type IconSize = "2xs" | "xs" | "sm" | "base" | "lg" | "xl";

/** Icon-specific size scale (distinct from the text scale): glyph font-size + bounding box (px). */
const ICON_SIZE: Record<IconSize, { font: number; box: number }> = {
  "2xs": { font: 8, box: 12 },
  xs: { font: 10, box: 10 },
  sm: { font: 12, box: 12 },
  base: { font: 14, box: 14 },
  lg: { font: 16, box: 16 },
  xl: { font: 20, box: 20 },
};

const ICON_COLOR: Record<IconColor, string> = {
  primary: "var(--icon-primary)",
  secondary: "var(--icon-secondary)",
  tertiary: "var(--icon-tertiary)",
  quaternary: "var(--icon-quaternary)",
  luminous: "var(--text-luminous)",
  inherit: "currentColor",
};

export interface IconProps {
  name: IconName;
  size?: IconSize;
  color?: IconColor;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = "base", color = "primary", className, style }: IconProps) {
  const { font, box } = ICON_SIZE[size];
  // Single <i> that flex-centers its own ::before glyph. Flexbox centers the
  // glyph's box on both axes (independent of text baseline), and since the
  // Cursor Icons glyphs are centered within their em box, the ink lands dead
  // center in the fixed box — no shift when a toggle flips active/inactive.
  return (
    <i
      className={clsx(`icon-${name}`, "flex shrink-0 items-center justify-center", className)}
      style={{
        width: box,
        height: box,
        fontSize: font,
        lineHeight: 1,
        color: ICON_COLOR[color],
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
