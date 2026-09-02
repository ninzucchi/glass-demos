import type { CSSProperties } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PROJECT_COLOR_STROKE, type ProjectColor } from "@/types";

const DEFAULT_SIZE = 80;

function badgeStyle(color: ProjectColor, size: number): CSSProperties {
  const key = PROJECT_COLOR_STROKE[color];
  const fillFrom = `color-mix(in oklab, ${key} 18%, var(--bg-chrome))`;
  const fillTo = `color-mix(in oklab, ${key} 8%, var(--bg-chrome))`;
  const strokeFrom = `color-mix(in oklab, ${key} 48%, transparent)`;
  const strokeTo = `color-mix(in oklab, ${key} 20%, transparent)`;
  return {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.2),
    border: "1px solid transparent",
    backgroundImage: `linear-gradient(var(--badge-angle), ${fillFrom}, ${fillTo}), linear-gradient(var(--badge-angle), ${strokeFrom}, ${strokeTo})`,
    backgroundOrigin: "padding-box, border-box",
    backgroundClip: "padding-box, border-box",
  };
}

/** Tinted project glyph. Shared by the thread header, create dialog, and doc cover. */
export function ProjectBadge({
  color,
  icon,
  size = DEFAULT_SIZE,
}: {
  color: ProjectColor;
  icon: IconName;
  size?: number;
}) {
  const glyph = Math.round(size * 0.5);
  return (
    <div
      className="flex items-center justify-center [--badge-angle:0deg] dark:[--badge-angle:180deg]"
      style={badgeStyle(color, size)}
    >
      <Icon
        name={icon}
        color="inherit"
        style={{ width: glyph, height: glyph, fontSize: glyph, color: PROJECT_COLOR_STROKE[color] }}
      />
    </div>
  );
}
