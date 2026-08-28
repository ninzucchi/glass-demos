import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DISCLOSURE_GROUP, FolderDisclosureIcon } from "@/components/ui/FolderDisclosureIcon";
import {
  PROJECT_COLOR_BG,
  PROJECT_COLOR_HOVER_BG,
  PROJECT_COLOR_STROKE,
  type AgentStatus,
  type ProjectColor,
} from "@/types";

export type SidebarLeading =
  | { kind: "workspace"; collapsed: boolean }
  | {
      kind: "project";
      collapsed: boolean;
      icon: IconName;
      color: ProjectColor;
      /** False: static colored icon, no hover chevron. Default true. */
      collapsible?: boolean;
    }
  | { kind: "agent"; status: AgentStatus }
  | { kind: "action"; icon: IconName };

// Live agent.status: idle = read (quaternary), running/attention = unread (accent).
const isUnread = (status: AgentStatus) => status !== "idle";

function ProjectLeading({
  leading,
}: {
  leading: Extract<SidebarLeading, { kind: "project" }>;
}) {
  const agentLike = leading.collapsible === false;
  const glyph = agentLike ? (
    <Icon
      name={leading.icon}
      size="base"
      color="inherit"
      style={{ color: PROJECT_COLOR_STROKE[leading.color] }}
    />
  ) : (
    <FolderDisclosureIcon
      open={!leading.collapsed}
      hitTarget
      icon={leading.icon}
      iconColor={PROJECT_COLOR_STROKE[leading.color]}
    />
  );

  if (agentLike) {
    return <span className="flex h-5 w-5 shrink-0 items-center justify-center">{glyph}</span>;
  }
  return glyph;
}

function Leading({ leading }: { leading: SidebarLeading }) {
  switch (leading.kind) {
    case "workspace":
      return <FolderDisclosureIcon open={!leading.collapsed} />;
    case "project":
      return <ProjectLeading leading={leading} />;
    case "action":
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon name={leading.icon} size="base" color="secondary" />
        </span>
      );
    case "agent": {
      const unread = isUnread(leading.status);
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: unread ? "var(--icon-accent)" : "var(--icon-quaternary)" }}
          />
        </span>
      );
    }
    default: {
      const _exhaustive: never = leading;
      return _exhaustive;
    }
  }
}

interface SidebarCellProps {
  label: string;
  leading?: SidebarLeading;
  selected?: boolean;
  muted?: boolean;
  /** Folder children: 4px indent per level. `nestLevel` wins when both are set. */
  nested?: boolean;
  /** Nest depth. Each level adds the same 4px indent. */
  nestLevel?: number;
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  /** Project folder chevron: expand/collapse without opening the project chat. */
  onLeadingClick?: () => void;
  /** Hover plus on a workspace or project row: create an agent in that group. */
  onAddClick?: () => void;
  /** Hover X on an elevated project child: demote it from the sidebar. */
  onHideClick?: () => void;
  /** Lets callers start a pointer drag from the row (e.g. drag a recent file
   *  into a tab) without owning the button markup. */
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function SidebarCell({
  label,
  leading,
  selected,
  muted,
  nested,
  nestLevel,
  onClick,
  onLeadingClick,
  onAddClick,
  onHideClick,
  onPointerDown,
}: SidebarCellProps) {
  // Every row: 20px leading slot, then 6px to the label. Each nest level adds
  // the same 4px spacer.
  const level = nestLevel ?? (nested ? 1 : 0);
  const nestPad = level * 4;
  const agentLike =
    leading?.kind === "agent" ||
    (leading?.kind === "project" && leading.collapsible === false) ||
    (muted && !leading);
  const projectColor = leading?.kind === "project" ? leading.color : undefined;
  const projectHover = projectColor ? PROJECT_COLOR_HOVER_BG[projectColor] : "hover:bg-quaternary";
  return (
    <button
      type="button"
      onClick={(e) => {
        if (onLeadingClick && (e.target as HTMLElement).closest("[data-disclosure]")) {
          onLeadingClick();
          return;
        }
        if (onAddClick && (e.target as HTMLElement).closest("[data-add]")) {
          onAddClick();
          return;
        }
        if (onHideClick && (e.target as HTMLElement).closest("[data-hide]")) {
          onHideClick();
          return;
        }
        onClick?.(e);
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-add], [data-hide]")) {
          e.stopPropagation();
          return;
        }
        onPointerDown?.(e);
      }}
      className={clsx(
        DISCLOSURE_GROUP,
        "flex w-full items-center gap-1.5 px-1.5 text-left",
        "h-[30px]",
        // Agent cells use rounded-lg (8px); folder/action cells use rounded-md (6px).
        agentLike ? "rounded-lg" : "rounded-md",
        muted
          ? ["text-tertiary", projectHover]
          : selected
            ? "text-primary"
            : ["text-secondary", projectHover],
        selected && (projectColor ? PROJECT_COLOR_BG[projectColor] : "bg-quaternary"),
      )}
    >
      {level > 0 && (
        <span className="shrink-0" style={{ width: nestPad }} aria-hidden />
      )}
      {leading ? <Leading leading={leading} /> : <span className="w-5 shrink-0" />}
      {/* Overflowing labels fade out via a right-edge gradient mask instead of an
          ellipsis. flex-1 fills the cell so short labels show fully (the fade
          falls on empty space) and only long labels fade. */}
      <span
        className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-base mix-blend-plus-darker"
        style={{
          maskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
          WebkitMaskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
        }}
      >
        {label}
      </span>
      {onAddClick && (
        <span
          data-add=""
          className="relative flex h-3.5 w-0 shrink-0 items-center justify-center overflow-hidden opacity-0 group-hover/disclosure:w-3.5 group-hover/disclosure:opacity-100 before:absolute before:-inset-y-1.5 before:-left-3 before:-right-2 before:content-['']"
        >
          <Icon name="plus" size="base" color="secondary" />
        </span>
      )}
      {onHideClick && (
        <span
          data-hide=""
          aria-label="Hide from sidebar"
          className="relative flex h-3.5 w-0 shrink-0 items-center justify-center overflow-hidden opacity-0 group-hover/disclosure:w-3.5 group-hover/disclosure:opacity-100 before:absolute before:-inset-y-1.5 before:-left-3 before:-right-2 before:content-['']"
        >
          <Icon name="eye-slash" size="base" color="secondary" />
        </span>
      )}
    </button>
  );
}
