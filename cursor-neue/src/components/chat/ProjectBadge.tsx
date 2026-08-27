import type { CSSProperties } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PROJECT_COLOR_STROKE, type ProjectColor } from "@/types";

const BADGE = 80;
const GLYPH = 40;
const RADIUS = 16;

function badgeStyle(color: ProjectColor): CSSProperties {
  const key = PROJECT_COLOR_STROKE[color];
  const fillFrom = `color-mix(in oklab, ${key} 18%, var(--bg-chrome))`;
  const fillTo = `color-mix(in oklab, ${key} 8%, var(--bg-chrome))`;
  const strokeFrom = `color-mix(in oklab, ${key} 48%, transparent)`;
  const strokeTo = `color-mix(in oklab, ${key} 20%, transparent)`;
  return {
    width: BADGE,
    height: BADGE,
    borderRadius: RADIUS,
    border: "1px solid transparent",
    backgroundImage: `linear-gradient(var(--badge-angle), ${fillFrom}, ${fillTo}), linear-gradient(var(--badge-angle), ${strokeFrom}, ${strokeTo})`,
    backgroundOrigin: "padding-box, border-box",
    backgroundClip: "padding-box, border-box",
  };
}

/** 80px tinted project glyph. Shared by the thread header and the create dialog. */
export function ProjectBadge({ color, icon }: { color: ProjectColor; icon: IconName }) {
  return (
    <div
      className="flex items-center justify-center [--badge-angle:0deg] dark:[--badge-angle:180deg]"
      style={badgeStyle(color)}
    >
      <Icon
        name={icon}
        color="inherit"
        style={{ width: GLYPH, height: GLYPH, fontSize: GLYPH, color: PROJECT_COLOR_STROKE[color] }}
      />
    </div>
  );
}
