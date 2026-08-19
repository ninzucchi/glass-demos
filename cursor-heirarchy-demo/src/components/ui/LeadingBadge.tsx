import clsx from "clsx";
import { Icon, type IconName } from "./Icon";

/** Face-badge fill colors; each agent hashes to a stable pick. */
const FACE_PALETTE = [
  "#C94F46", // Hal red
  "#D98A3D",
  "#C9A93F",
  "#5F9E58",
  "#4A9E97",
  "#5B87D6",
  "#8B6FC9",
  "#C96F9E",
];

const faceColor = (label: string) => {
  let hash = 0;
  for (const char of label) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FACE_PALETTE[hash % FACE_PALETTE.length];
};

/** Subtle sheen layered over circular badges; clipped by the rounded shape. */
const SHEEN_GRADIENT =
  "linear-gradient(to bottom, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0))";

/** 20px leading identity badge: rounded-square chiclet for spaces, circle for
 *  groups/projects, or an agent "face" — a colored circle with two upright
 *  eyes (color hashed from the label, so each agent keeps its own). */
export function LeadingBadge({
  shape,
  icon,
  label,
  className,
}: {
  shape: "chiclet" | "circle" | "face";
  icon?: IconName;
  label: string;
  className?: string;
}) {
  if (shape === "face") {
    return (
      <span
        className={clsx(
          "flex h-5 w-5 shrink-0 items-center justify-center gap-[3px] rounded-full",
          className,
        )}
        style={{ background: `${SHEEN_GRADIENT}, ${faceColor(label)}` }}
      >
        <span className="h-[7px] w-[2.5px] rounded-full bg-black/75" />
        <span className="h-[7px] w-[2.5px] rounded-full bg-black/75" />
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "flex h-5 w-5 shrink-0 items-center justify-center bg-tertiary",
        shape === "chiclet" ? "rounded-md" : "rounded-full",
        className,
      )}
      style={shape === "circle" ? { backgroundImage: SHEEN_GRADIENT } : undefined}
    >
      {icon ? (
        <Icon name={icon} size="sm" color="secondary" />
      ) : (
        <span className="text-sm font-medium leading-none text-secondary">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
