import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DISCLOSURE_GROUP, FolderDisclosureIcon } from "@/components/ui/FolderDisclosureIcon";
import type { AgentStatus } from "@/types";

export type SidebarLeading =
  | { kind: "workspace"; collapsed: boolean }
  | { kind: "agent"; status: AgentStatus }
  | { kind: "action"; icon: IconName };

// Read/unread model only (no orange): idle = read (quaternary), otherwise unread (accent).
const isUnread = (status: AgentStatus) => status !== "idle";

function Leading({ leading }: { leading: SidebarLeading }) {
  // Workspace rows show a folder at rest and the disclosure chevron on hover,
  // via the shared FolderDisclosureIcon (the parent button carries DISCLOSURE_GROUP).
  if (leading.kind === "workspace") {
    return <FolderDisclosureIcon open={!leading.collapsed} />;
  }
  // Action rows share the same 14px icon box; only the glyph differs.
  if (leading.kind === "action") {
    return (
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <Icon name={leading.icon} size="base" color="secondary" />
      </span>
    );
  }
  // Agent status dot, centered in a fixed 20px box (shrink-0 so the gap to the
  // label stays constant as the sidebar resizes).
  const unread = isUnread(leading.status);
  return (
    <span className="flex w-5 shrink-0 items-center justify-center">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: unread ? "var(--icon-accent)" : "var(--icon-quaternary)" }}
      />
    </span>
  );
}

interface SidebarCellProps {
  label: string;
  leading?: SidebarLeading;
  selected?: boolean;
  muted?: boolean;
  onClick?: () => void;
  /** Lets callers start a pointer drag from the row (e.g. drag a recent file
   *  into a tab) without owning the button markup. */
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function SidebarCell({ label, leading, selected, muted, onClick, onPointerDown }: SidebarCellProps) {
  // Agent + muted rows: a 20px leading box sits flush to the label so the label
  // aligns with workspace/action labels (icon 14 + gap 6 = 20). Workspace/action
  // rows: 14px icon + 6px gap.
  const agentLike = leading?.kind === "agent" || (muted && !leading);
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={clsx(
        DISCLOSURE_GROUP,
        "flex w-full items-center px-1.5 text-left",
        // Agent cells use rounded-lg (8px); Default (action/workspace) cells rounded-md (6px).
        agentLike ? "h-[30px] rounded-lg" : "h-7 gap-1.5 rounded-md",
        muted
          ? "text-tertiary hover:bg-quaternary"
          : selected
            ? "bg-quaternary text-primary"
            : "text-secondary hover:bg-quaternary",
      )}
    >
      {leading ? <Leading leading={leading} /> : <span className="w-5 shrink-0" />}
      {/* Overflowing labels fade out via a right-edge gradient mask instead of an
          ellipsis. flex-1 fills the cell so short labels show fully (the fade
          falls on empty space) and only long labels fade. */}
      <span
        className="min-w-0 flex-1 overflow-hidden whitespace-nowrap pl-0.5 text-base mix-blend-plus-darker"
        style={{
          maskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
          WebkitMaskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
        }}
      >
        {label}
      </span>
    </button>
  );
}
