import clsx from "clsx";
import { Icon, type IconName } from "@/components/ui/Icon";

// Shared CSS group marker that the disclosure swap hangs off of. The parent row
// button MUST carry this class (see FolderDisclosureIcon below).
export const DISCLOSURE_GROUP = "group/disclosure";

/** Leading glyph for a collapsible folder row: folder at rest, disclosure chevron
 *  on hover. Hover is driven by the parent row's CSS `:hover` (the
 *  `group/disclosure` marker), so it reflects the true pointer position even on
 *  mount or after the list shifts. The rest glyph stays mounted and only
 *  toggles opacity (instant cut). The chevron is one glyph that rotates 90°
 *  with 200ms ease-out-quart when the folder opens.
 *  `hitTarget` grows the clickable pad via ::before so a chevron toggle is
 *  easy to hit without covering the title. */
export function FolderDisclosureIcon({
  open,
  hitTarget,
  icon,
  iconColor,
}: {
  open: boolean;
  hitTarget?: boolean;
  /** Resting glyph. Defaults to folder / folder-open. */
  icon?: IconName;
  /** Stroke for the resting glyph only. Chevron stays icon-secondary. */
  iconColor?: string;
}) {
  const restIcon = icon ?? (open ? "folder-open" : "folder");
  return (
    <span
      data-disclosure={hitTarget ? "" : undefined}
      className={clsx(
        // Same 20px slot as agent status dots so folder/project rows share
        // their leading geometry. The 14px glyph sits centered, so it sits
        // 3px further right than the old 14px-wide box.
        "relative flex h-5 w-5 shrink-0 items-center justify-center",
        hitTarget &&
          "before:absolute before:-inset-y-1.5 before:-left-2 before:-right-2 before:content-['']",
      )}
    >
      <Icon
        name={restIcon}
        size="base"
        color={iconColor ? "inherit" : "secondary"}
        className="group-hover/disclosure:opacity-0"
        style={iconColor ? { color: iconColor } : undefined}
      />
      <Icon
        name="chevron-right"
        size="base"
        color="secondary"
        className={clsx(
          "absolute opacity-0 transition-transform duration-slow ease-out-quart group-hover/disclosure:opacity-100",
          open && "rotate-90",
        )}
      />
    </span>
  );
}
