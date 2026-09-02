import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import clsx from "clsx";
import { AgentStatusIcon } from "@/components/ui/AgentStatusIcon";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DISCLOSURE_GROUP, FolderDisclosureIcon } from "@/components/ui/FolderDisclosureIcon";
import {
  SIDEBAR_ROW_PAD_X,
  sidebarNestLevel,
  sidebarNestPad,
} from "@/components/sidebar/sidebarNest";
import {
  PROJECT_COLOR_BG,
  PROJECT_COLOR_HOVER_BG,
  PROJECT_COLOR_STROKE,
  type AgentStatus,
  type ProjectColor,
} from "@/types";

export type SidebarLeading =
  | { kind: "workspace"; collapsed: boolean; hitTarget?: boolean; collapsible?: boolean }
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

function projectFolderIcon(icon: IconName, open: boolean): IconName {
  return icon === "folder" && open ? "folder-open" : icon;
}

function ProjectLeading({
  leading,
  selected,
}: {
  leading: Extract<SidebarLeading, { kind: "project" }>;
  selected?: boolean;
}) {
  const agentLike = leading.collapsible === false;
  const open = agentLike ? !!selected : !leading.collapsed;
  const icon = projectFolderIcon(leading.icon, open);
  const glyph = agentLike ? (
    <Icon
      name={icon}
      size="base"
      color="inherit"
      style={{ color: PROJECT_COLOR_STROKE[leading.color] }}
    />
  ) : (
    <FolderDisclosureIcon
      open={!leading.collapsed}
      hitTarget
      icon={icon}
      iconColor={PROJECT_COLOR_STROKE[leading.color]}
    />
  );

  if (agentLike) {
    return <span className="flex h-5 w-5 shrink-0 items-center justify-center">{glyph}</span>;
  }
  return glyph;
}

function Leading({ leading, selected }: { leading: SidebarLeading; selected?: boolean }) {
  switch (leading.kind) {
    case "workspace":
      if (leading.collapsible === false) {
        return (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <Icon name="folder" size="base" color="secondary" />
          </span>
        );
      }
      return (
        <FolderDisclosureIcon open={!leading.collapsed} hitTarget={leading.hitTarget} />
      );
    case "project":
      return <ProjectLeading leading={leading} selected={selected} />;
    case "action":
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon name={leading.icon} size="base" color="secondary" />
        </span>
      );
    case "agent":
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <AgentStatusIcon status={leading.status} />
        </span>
      );
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
  /** Folder children: one nest step per level. `nestLevel` wins when both are set. */
  nested?: boolean;
  /** Nest depth. Each level adds the same indent. */
  nestLevel?: number;
  onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
  /** Project folder chevron: expand/collapse without opening the project chat. */
  onLeadingClick?: () => void;
  /** Hover plus on a workspace or project row: create an agent in that group. */
  onAddClick?: () => void;
  /** Hover X on an elevated project child: demote it from the sidebar. */
  onHideClick?: () => void;
  /** Lets callers start a pointer drag from the row (e.g. drag a recent file
   *  into a tab) without owning the button markup. */
  onPointerDown?: (e: ReactPointerEvent<HTMLElement>) => void;
  /** Double-click the label to rename in place. Omit on rows that cannot rename. */
  onRename?: (next: string) => void;
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
  onRename,
}: SidebarCellProps) {
  // Every row: 20px leading slot, then 6px to the label. Nest is extra
  // padding-left (same step every level). See sidebarNest.ts.
  const level = sidebarNestLevel(nestLevel, nested);
  const nestPad = sidebarNestPad(level);
  const agentLike =
    leading?.kind === "agent" ||
    (leading?.kind === "project" && leading.collapsible === false) ||
    (muted && !leading);
  const projectColor = leading?.kind === "project" ? leading.color : undefined;
  const projectHover = projectColor ? PROJECT_COLOR_HOVER_BG[projectColor] : "hover:bg-quaternary";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const startRename = () => {
    if (!onRename) return;
    setDraft(label);
    setEditing(true);
  };
  const finishRename = (save: boolean, value: string) => {
    setEditing(false);
    if (save) onRename?.(value);
  };
  const onRowClick = (e: ReactMouseEvent<HTMLElement>) => {
    if (editing) return;
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
  };
  const onRowPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (editing) return;
    if ((e.target as HTMLElement).closest("[data-add], [data-hide]")) {
      e.stopPropagation();
      return;
    }
    onPointerDown?.(e);
  };
  const onRowDoubleClick = (e: ReactMouseEvent<HTMLElement>) => {
    if (!onRename) return;
    if ((e.target as HTMLElement).closest("[data-disclosure], [data-add], [data-hide]")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    startRename();
  };
  const rowClass = clsx(
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
  );
  const rowStyle =
    nestPad > 0 ? { paddingLeft: SIDEBAR_ROW_PAD_X + nestPad } : undefined;
  const onRowKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (editing) return;
    if (e.target !== e.currentTarget) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onRowClick(e as unknown as ReactMouseEvent<HTMLElement>);
  };
  return (
    <div
      role={editing ? undefined : "button"}
      tabIndex={editing ? -1 : 0}
      onClick={onRowClick}
      onPointerDown={onRowPointerDown}
      onDoubleClick={onRowDoubleClick}
      onKeyDown={onRowKeyDown}
      className={rowClass}
      style={rowStyle}
    >
      {leading ? <Leading leading={leading} selected={selected} /> : <span className="w-5 shrink-0" />}
      <SidebarLabel
        label={label}
        editing={editing}
        draft={draft}
        onDraftChange={setDraft}
        onFinish={finishRename}
      />
      {!editing && onAddClick && (
        <span
          data-add=""
          className="relative flex h-3.5 w-0 shrink-0 items-center justify-center overflow-hidden text-[color:var(--icon-tertiary)] opacity-0 hover:text-[color:var(--icon-secondary)] group-hover/disclosure:w-3.5 group-hover/disclosure:opacity-100 before:absolute before:-inset-y-1.5 before:-left-3 before:-right-2 before:content-['']"
        >
          <Icon name="plus" size="base" color="inherit" />
        </span>
      )}
      {!editing && onHideClick && (
        <span
          data-hide=""
          aria-label="Hide from sidebar"
          className="relative flex h-3.5 w-0 shrink-0 items-center justify-center overflow-hidden text-[color:var(--icon-tertiary)] opacity-0 hover:text-[color:var(--icon-secondary)] group-hover/disclosure:w-3.5 group-hover/disclosure:opacity-100 before:absolute before:-inset-y-1.5 before:-left-3 before:-right-2 before:content-['']"
        >
          <Icon name="eye-slash" size="base" color="inherit" />
        </span>
      )}
    </div>
  );
}

const LABEL_CLASS = "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-base mix-blend-plus-darker";

function SidebarLabel({
  label,
  editing,
  draft,
  onDraftChange,
  onFinish,
}: {
  label: string;
  editing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onFinish: (save: boolean, value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useLayoutEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.select();
    const id = requestAnimationFrame(() => el.select());
    return () => cancelAnimationFrame(id);
  }, [editing]);
  useEffect(() => {
    if (!editing) return;
    const onPointerDown = (event: PointerEvent) => {
      const el = inputRef.current;
      if (el && event.target instanceof Node && el.contains(event.target)) return;
      finishRef.current(true, draftRef.current);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finishRef.current(true, draftRef.current);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        finishRef.current(false, draftRef.current);
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [editing]);

  if (!editing) {
    // Overflowing labels fade out via a right-edge gradient mask instead of an
    // ellipsis. flex-1 fills the cell so short labels show fully (the fade
    // falls on empty space) and only long labels fade.
    return (
      <span
        className={LABEL_CLASS}
        style={{
          maskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
          WebkitMaskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
        }}
      >
        {label}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      aria-label="Rename"
      spellCheck={false}
      autoComplete="off"
      onChange={(e) => onDraftChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={clsx(
        LABEL_CLASS,
        "select-text bg-transparent p-0 outline-none [appearance:none] [border:0] [box-shadow:none] [margin:0]",
      )}
    />
  );
}
