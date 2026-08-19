import { Icon } from "@/components/ui/Icon";

// Shared CSS group marker that the disclosure swap hangs off of. The parent row
// button MUST carry this class (see FolderDisclosureIcon below).
export const DISCLOSURE_GROUP = "group/disclosure";

/** Leading glyph for a collapsible folder row: folder at rest, disclosure chevron
 *  on hover. Hover is driven by the parent row's CSS `:hover` (the
 *  `group/disclosure` marker), so it reflects the true pointer position even on
 *  mount or after the list shifts. Both glyphs stay mounted and only toggle
 *  opacity (instant cut), so flipping open/closed never flashes the folder. */
export function FolderDisclosureIcon({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
      <Icon
        name={open ? "folder-open" : "folder"}
        size="base"
        color="secondary"
        className="group-hover/disclosure:opacity-0"
      />
      <Icon
        name={open ? "chevron-down" : "chevron-right"}
        size="base"
        color="secondary"
        className="absolute opacity-0 group-hover/disclosure:opacity-100"
      />
    </span>
  );
}
