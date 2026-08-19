import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Icon, type IconName } from "./ui/Icon";
import { LeadingBadge } from "./ui/LeadingBadge";
import { flattenThreads } from "../data";
import type { Project, Thread, Workspace } from "../types";

/** The workspace the Distinct/Flat variant applies to. */
const HOME_ID = "ws-home";

/** Sidebar layout experiment, owned by App (the background settings rail).
 *  "distinct": Home is its own workspace group. "flat": Home's items sit at
 *  the top level, siblings of the other workspace groups; every container
 *  (space/agent/group) wears the circle badge.
 *  "flat-home-agent": like flat, but Home itself renders as an agent row
 *  holding its chats, and the section is titled "Agents".
 *  "sections": Home's items under a "Home" section title, other workspaces
 *  under "Spaces". The space-agent pair ("Agents, … Groups"): like distinct,
 *  but spaces wear the agent circle badge and Home's chats sit flat at the
 *  top level (no Home row, no Home agents). Groups are chat-able folder rows
 *  in "space-agent"; in "space-agent-readonly" the folder isn't chat-able —
 *  the row toggles instead of opening a chat, but can still create children.
 *
 *  The "sq" family renders workspaces as plain folders (icon, not badge)
 *  holding flat chat lists. "sq": only workspace folders (no home-level
 *  chats), groups dissolve into their workspace's chats. "projects-separate": projects hoist into their own "Projects"
 *  section above the chats. "all-projects": projects hoist as siblings next
 *  to their workspace's folder. "projects-readonly": only workspace folders
 *  (no home-level chats or projects); project rows are plain folders too —
 *  toggling, not selectable. */
export type HomeVariant =
  | "distinct"
  | "flat"
  | "flat-home-agent"
  | "sections"
  | "space-agent"
  | "space-agent-readonly"
  | "sq"
  | "projects-separate"
  | "all-projects"
  | "projects-readonly";

/** One entry in a create-type menu: the entity a plus button can make. */
interface CreateOption {
  icon: IconName;
  label: string;
  onClick: () => void;
}

/** Muted section label (from cursor-neue's SidebarSectionHeader). Clicking
 *  it collapses/expands the section; a chevron reveals on header hover.
 *  With onCreate (or createOptions), a plus affordance reveals on header
 *  hover too. */
function SectionHeader({
  label,
  open,
  onToggle,
  createLabel,
  onCreate,
  createOptions,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  createLabel?: string;
  onCreate?: () => void;
  createOptions?: CreateOption[];
}) {
  return (
    <div
      onClick={onToggle}
      className={clsx(
        DISCLOSURE_GROUP,
        // Fixed height: the hover-revealed plus button is taller than the
        // text, so content-driven sizing would make headers with a create
        // affordance taller than ones without (title jitter across variants).
        "flex h-7 cursor-pointer items-center gap-1 px-1.5",
      )}
    >
      <span className="truncate text-sm text-tertiary mix-blend-plus-darker">{label}</span>
      <Icon
        name={open ? "chevron-down" : "chevron-right"}
        size="sm"
        color="tertiary"
        className="opacity-0 group-hover/disclosure:opacity-100"
      />
      {(onCreate || createOptions) && (
        <CreateButton label={createLabel ?? "New"} onClick={onCreate} options={createOptions} />
      )}
    </div>
  );
}

/** A titled sidebar section whose header collapses its contents. */
function Section({
  label,
  createLabel,
  onCreate,
  createOptions,
  children,
}: {
  label: string;
  createLabel?: string;
  onCreate?: () => void;
  createOptions?: CreateOption[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={clsx("flex flex-col", open && "gap-1")}>
      <SectionHeader
        label={label}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        createLabel={createLabel}
        onCreate={onCreate}
        createOptions={createOptions}
      />
      {open && children}
    </div>
  );
}

// Shared CSS group marker the disclosure swap hangs off of; the parent row
// must carry this class (from cursor-neue's FolderDisclosureIcon).
const DISCLOSURE_GROUP = "group/disclosure";

/** Layouts that erase the agent/group distinction — every project renders
 *  and reads as an agent. */
export const AGENT_NOUN_VARIANTS: HomeVariant[] = [
  "distinct",
  "sections",
  "flat",
  "flat-home-agent",
];

/** What a row being dragged is, and what a row being hovered is. Validity is
 *  hierarchy-driven: threads drop into workspaces and projects to move, and
 *  onto other threads to form a group with them (never nesting); projects
 *  only drop into workspaces. */
type DragKind = "thread" | "project";
type TargetKind = "workspace" | "project" | "thread";

/** Sidebar-level drag-and-drop wiring: thread and project rows drag;
 *  workspace, project, and thread rows accept drops. Threaded to every row. */
interface Dnd {
  /** Container currently hovered by a valid drag, for the drop highlight. */
  dropId: string | null;
  start: (kind: DragKind, id: string, e: React.DragEvent) => void;
  end: () => void;
  over: (targetId: string, targetKind: TargetKind, e: React.DragEvent) => void;
  leave: (targetId: string) => void;
  drop: (targetId: string, targetKind: TargetKind, e: React.DragEvent) => void;
}

/** Drag-source listeners for a movable row. */
function dragSourceProps(dnd: Dnd, kind: DragKind, id: string) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => dnd.start(kind, id, e),
    onDragEnd: dnd.end,
  };
}

/** Drop-target listeners for a container row. */
function dropProps(dnd: Dnd, targetId: string, targetKind: TargetKind) {
  return {
    onDragOver: (e: React.DragEvent) => dnd.over(targetId, targetKind, e),
    onDragLeave: (e: React.DragEvent) => {
      // Moving onto a child of the row isn't leaving the row.
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      dnd.leave(targetId);
    },
    onDrop: (e: React.DragEvent) => dnd.drop(targetId, targetKind, e),
  };
}

/** Inline-rename wiring, threaded to every row alongside dnd. */
interface Renamer {
  /** Row currently in inline-edit mode (workspace, project, or thread id). */
  id: string | null;
  commit: (id: string, name: string) => void;
  cancel: () => void;
}

/** Inline edit field swapped in for a row's label during rename. Enter
 *  commits, Escape cancels, clicking away commits. */
function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  // Enter/Escape already resolved the edit; don't double-commit on the blur
  // that follows.
  const done = useRef(false);
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          done.current = true;
          onCommit(value);
        } else if (e.key === "Escape") {
          done.current = true;
          onCancel();
        }
      }}
      onBlur={() => {
        if (!done.current) onCommit(value);
      }}
      className="min-w-0 flex-1 rounded bg-elevated px-0.5 text-base text-primary outline-none"
    />
  );
}

/** Agent-spawned threads stay out of the sidebar until the user has replied
 *  in them; until then they're reachable via their card in the parent chat. */
const isExposed = (t: Thread) =>
  t.createdBy !== "agent" || t.messages.some((m) => m.role === "user");

/** Threads that still live in their workspace/project list. Pinned ones are
 *  lifted into the Pinned section so they don't render (and highlight) twice. */
const isListed = (t: Thread) => isExposed(t) && !t.pinned;

/** Leading badge for a collapsible row: identity badge at rest, disclosure
 *  chevron on row hover. Both stay mounted and only toggle opacity (instant
 *  cut) so flipping open/closed never flashes the badge. */
function DisclosureBadge({
  open,
  shape,
  icon,
  label,
  onToggle,
}: {
  open: boolean;
  shape: "chiclet" | "circle" | "face";
  icon?: IconName;
  label: string;
  onToggle?: () => void;
}) {
  return (
    <span
      className="relative flex h-5 w-5 shrink-0 items-center justify-center"
      onClick={
        onToggle &&
        ((e) => {
          e.stopPropagation();
          onToggle();
        })
      }
    >
      <LeadingBadge
        shape={shape}
        icon={icon}
        label={label}
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

/** Thread-style leading: 6px dot at rest, swapping to a disclosure chevron
 *  on row hover when the row can collapse (from cursor-neue's SidebarCell
 *  agent status dot). */
function DisclosureDot({
  open,
  hasChevron,
  onToggle,
}: {
  open: boolean;
  hasChevron: boolean;
  onToggle?: () => void;
}) {
  return (
    <span
      className="relative flex h-5 w-5 shrink-0 items-center justify-center"
      onClick={
        hasChevron && onToggle
          ? (e) => {
              e.stopPropagation();
              onToggle();
            }
          : undefined
      }
    >
      {/* Accent (blue) dot is reserved for unread state, not selection. */}
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          hasChevron && "group-hover/disclosure:opacity-0",
        )}
        style={{ background: "var(--icon-quaternary)" }}
      />
      {hasChevron && (
        <Icon
          name={open ? "chevron-down" : "chevron-right"}
          size="base"
          color="secondary"
          className="absolute opacity-0 group-hover/disclosure:opacity-100"
        />
      )}
    </span>
  );
}

/** Plain-glyph leading (no badge circle): the icon (or initial letter) at
 *  rest, swapping to a disclosure chevron on row hover — the un-badged
 *  sibling of DisclosureBadge. */
function DisclosureIcon({
  open,
  icon,
  label,
  onToggle,
}: {
  open: boolean;
  icon?: IconName;
  label: string;
  onToggle: () => void;
}) {
  return (
    <span
      className="relative flex h-5 w-5 shrink-0 items-center justify-center"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <span className="flex items-center justify-center group-hover/disclosure:opacity-0">
        {icon ? (
          <Icon name={icon} size="base" color="secondary" />
        ) : (
          <span className="text-sm font-medium leading-none text-secondary">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <Icon
        name={open ? "chevron-down" : "chevron-right"}
        size="base"
        color="secondary"
        className="absolute opacity-0 group-hover/disclosure:opacity-100"
      />
    </span>
  );
}

/** Plain folder glyph leading for the SQ-family rows (no identity badge,
 *  no chevron swap — the folder itself signals open/closed). */
function FolderLeading({ open }: { open: boolean }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      <Icon name={open ? "folder-open" : "folder"} size="base" color="secondary" />
    </span>
  );
}

/** SQ-style chat list for a workspace: optionally dissolves its groups, then
 *  splats all nesting so every chat renders as a leaf row. */
function flatChats(workspace: Workspace, dissolveProjects: boolean): Workspace["items"] {
  const top = workspace.items.flatMap((i) =>
    i.kind === "thread" ? [i.thread] : dissolveProjects ? i.project.threads : [],
  );
  return flattenThreads(top)
    .filter(isListed)
    .map((thread) => ({ kind: "thread" as const, thread: { ...thread, threads: undefined } }));
}

interface SidebarProps {
  workspaces: Workspace[];
  homeVariant: HomeVariant;
  selectedId: string | null;
  /** Freshly created entity whose row should open in inline-rename with its
   *  placeholder name selected, so it can be named immediately. */
  renameRequestId: string | null;
  onRenameRequestHandled: () => void;
  onSelect: (id: string) => void;
  onCreateChat: (workspaceId: string) => void;
  /** Sidebar-created threads only spawn inside groups (projects); subthreads
   *  require a chat-content anchor and are created from the chat timeline. */
  onCreateThread: (projectId: string) => void;
  /** New empty agent group (project) in the given workspace. */
  onCreateProject: (workspaceId: string) => void;
  /** New empty space (workspace). */
  onCreateSpace: () => void;
  /** Moves the given threads into a new "Untitled group" project. */
  onGroup: (threadIds: string[]) => void;
  /** Drag-and-drop: moves threads into a workspace or group. */
  onMove: (threadIds: string[], targetId: string) => void;
  /** Drag-and-drop: reparents projects (agents/groups) into a workspace. */
  onMoveProject: (projectIds: string[], workspaceId: string) => void;
  /** Renames a workspace, project, or thread (ids are unique across all). */
  onRename: (id: string, name: string) => void;
  /** Removes the given threads (and their subthreads). */
  onDelete: (threadIds: string[]) => void;
  /** Removes a group (project) and everything inside it. */
  onDeleteProject: (projectId: string) => void;
}

export function Sidebar({
  workspaces,
  homeVariant,
  selectedId,
  renameRequestId,
  onRenameRequestHandled,
  onSelect: onSelectProp,
  onCreateChat,
  onCreateThread,
  onCreateProject,
  onCreateSpace,
  onGroup,
  onMove,
  onMoveProject,
  onRename,
  onDelete,
  onDeleteProject,
}: SidebarProps) {
  // Cmd/Ctrl+click multi-selection of thread cells, in click order.
  const [multi, setMulti] = useState<string[]>([]);
  // Plain-clicking any row is "clicking away" from the multi-selection.
  const onSelect = (id: string) => {
    setMulti([]);
    onSelectProp(id);
  };
  const toggleMulti = (id: string) =>
    setMulti((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  // Context menu anchored at the cursor. Shift+click selects a range (like
  // file managers) from the anchor — the last-selected thread, else the
  // currently active chat — using the DOM's visible row order, then opens
  // the menu. Plain right-click just adds the clicked thread.
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    projectId?: string;
    workspaceId?: string;
  } | null>(null);
  // Inline rename state: the row whose label is currently an edit field.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  // Newly created entities arrive with a rename request so their placeholder
  // name starts selected in the edit field.
  useEffect(() => {
    if (renameRequestId) {
      setRenamingId(renameRequestId);
      onRenameRequestHandled();
    }
  }, [renameRequestId, onRenameRequestHandled]);
  const renamer: Renamer = {
    id: renamingId,
    commit: (id, name) => {
      const trimmed = name.trim();
      if (trimmed) onRename(id, trimmed);
      setRenamingId(null);
    },
    cancel: () => setRenamingId(null),
  };
  // Right-clicking a group row offers Rename/Delete for the whole group
  // instead of the thread multi-selection actions.
  const openProjectMenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, projectId: id });
  };
  // Right-clicking a workspace (space) row offers Rename.
  const openWorkspaceMenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, workspaceId: id });
  };
  const openMenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      const order = Array.from(
        asideRef.current?.querySelectorAll<HTMLElement>("[data-thread-id]") ?? [],
      ).map((el) => el.dataset.threadId as string);
      const anchor = multi.length > 0 ? multi[multi.length - 1] : selectedId;
      const from = anchor ? order.indexOf(anchor) : -1;
      const to = order.indexOf(id);
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from < to ? [from, to] : [to, from];
        const range = order.slice(lo, hi + 1);
        setMulti((m) => [...m, ...range.filter((x) => !m.includes(x))]);
      } else {
        setMulti((m) => (m.includes(id) ? m : [...m, id]));
      }
    } else {
      setMulti((m) => (m.includes(id) ? m : [...m, id]));
    }
    setMenu({ x: e.clientX, y: e.clientY });
  };
  const pinned = workspaces.flatMap((w) =>
    w.items.flatMap((i) =>
      flattenThreads(i.kind === "thread" ? [i.thread] : i.project.threads).filter(
        (t) => t.pinned,
      ),
    ),
  );
  // Clicking anywhere outside the sidebar clears the multi-selection. The
  // menu has no blocking backdrop (so shift+click can keep adding threads
  // while it's open); mousedown outside the menu closes it instead.
  const asideRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (multi.length === 0 && !menu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      setMenu(null);
      if (asideRef.current && !asideRef.current.contains(target)) setMulti([]);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [multi.length, menu]);
  const home = workspaces.find((w) => w.id === HOME_ID);
  // Variants that render Home inline keep it in the list; the rest treat it
  // specially and only iterate the real spaces.
  const homeInline = [
    "distinct",
    "flat",
    "flat-home-agent",
    "space-agent",
    "space-agent-readonly",
  ].includes(homeVariant);
  const spaces = homeInline ? workspaces : workspaces.filter((w) => w.id !== HOME_ID);
  // The two space-agent flavors share a layout; only the group folders'
  // interactivity differs.
  const spaceAgent = homeVariant === "space-agent" || homeVariant === "space-agent-readonly";

  // Dragging a multi-selected thread moves the whole selection; anything
  // else moves just the dragged row.
  const [drag, setDrag] = useState<{
    kind: DragKind;
    ids: string[];
    invalid: Set<string>;
  } | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const canDrop = (targetId: string, targetKind: TargetKind) => {
    if (!drag) return false;
    // Projects can't nest — a workspace (space) is their only valid parent.
    if (drag.kind === "project") return targetKind === "workspace";
    // Dropping onto a thread groups the two together rather than nesting, so
    // thread targets only work in layouts that have groups (SQ doesn't).
    if (targetKind === "thread" && homeVariant === "sq") return false;
    return !drag.invalid.has(targetId);
  };
  const dnd: Dnd = {
    dropId,
    start: (kind, id, e) => {
      e.dataTransfer.effectAllowed = "move";
      if (kind === "project") {
        setDrag({ kind, ids: [id], invalid: new Set() });
        return;
      }
      const ids = multi.includes(id) ? multi : [id];
      // A dragged thread can't drop into itself or its own subtree, and
      // grouping it with one of its own ancestors would be a no-op — block
      // both so the drop highlight never lies.
      const invalid = new Set<string>();
      const walk = (threads: Thread[], ancestors: string[]) => {
        for (const t of threads) {
          if (ids.includes(t.id)) {
            for (const d of flattenThreads([t])) invalid.add(d.id);
            for (const a of ancestors) invalid.add(a);
          } else {
            walk(t.threads ?? [], [...ancestors, t.id]);
          }
        }
      };
      for (const w of workspaces) {
        for (const i of w.items) {
          walk(i.kind === "thread" ? [i.thread] : i.project.threads, []);
        }
      }
      setDrag({ kind, ids, invalid });
    },
    end: () => {
      setDrag(null);
      setDropId(null);
    },
    over: (targetId, targetKind, e) => {
      if (!canDrop(targetId, targetKind)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropId(targetId);
    },
    leave: (targetId) => setDropId((d) => (d === targetId ? null : d)),
    drop: (targetId, targetKind, e) => {
      if (!canDrop(targetId, targetKind)) return;
      e.preventDefault();
      if (drag!.kind === "project") onMoveProject(drag!.ids, targetId);
      // Thread onto thread: form a group of the two (anchored at the target,
      // so the group takes its slot) instead of nesting a subthread.
      else if (targetKind === "thread") onGroup([targetId, ...drag!.ids]);
      else onMove(drag!.ids, targetId);
      setMulti([]);
      setDrag(null);
      setDropId(null);
    },
  };

  return (
    <aside ref={asideRef} className="flex h-full w-[232px] shrink-0 flex-col">
      {/* Fixed action cells above the scroll area (from cursor-neue). */}
      <div className="flex flex-col gap-px px-2 pt-2">
        <ActionCell icon="magnifying-glass" label="Search" />
        <ActionCell icon="agent" label="New" onClick={() => onCreateChat(HOME_ID)} />
        <ActionCell icon="tray" label="Inbox" />
        <ActionCell icon="extensions" label="Customize" />
      </div>
      <div
        className="scrollbar-overlay flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-2 pt-3"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent, #000 20px, #000 calc(100% - 20px), transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, #000 20px, #000 calc(100% - 20px), transparent)",
        }}
      >
        {pinned.length > 0 && (
          <Section label="Pinned">
            <div className="flex flex-col gap-px">
              {pinned.map((thread) => (
                <ThreadCell
                  key={thread.id}
                  thread={thread}
                  depth={0}
                  selectedId={selectedId}
                  multi={multi}
                  dnd={dnd}
                  renamer={renamer}
                  onSelect={onSelect}
                  onToggleMulti={toggleMulti}
                  onContextMenu={openMenu}
                />
              ))}
            </div>
          </Section>
        )}

        {homeVariant === "sections" && home && (
          <>
            <Section
              label="Home"
              createLabel="New"
              // Home holds both loose chats and agents, so the plus offers a
              // choice instead of assuming a chat.
              createOptions={[
                { icon: "chat-bubble", label: "New chat", onClick: () => onCreateChat(HOME_ID) },
                { icon: "agent", label: "New agent", onClick: () => onCreateProject(HOME_ID) },
              ]}
            >
              <div className="flex flex-col gap-px">
                {home.items.some((i) => i.kind === "project" || isListed(i.thread)) ? (
                  <ItemList
                    // Agents above loose chats, per the section's design.
                    items={[
                      ...home.items.filter((i) => i.kind === "project"),
                      ...home.items.filter((i) => i.kind === "thread"),
                    ]}
                    depth={0}
                    // No agent/group distinction here — every project is an
                    // agent (mirrors All Spaces).
                    projectLeading="face"
                    selectedId={selectedId}
                    multi={multi}
                    dnd={dnd}
                    renamer={renamer}
                    onToggleMulti={toggleMulti}
                    onThreadContextMenu={openMenu}
                    onProjectContextMenu={openProjectMenu}
                    onSelect={onSelect}
                    onCreateThread={onCreateThread}
                  />
                ) : (
                  <EmptyRow depth={0} />
                )}
              </div>
            </Section>
            <Section label="Spaces" createLabel="New space" onCreate={onCreateSpace}>
              <div className="flex flex-col gap-px">
                {spaces.map((workspace) => (
                  <WorkspaceGroup
                    key={workspace.id}
                    workspace={workspace}
                    projectLeading="face"
                    selectedId={selectedId}
                    multi={multi}
                    dnd={dnd}
                    renamer={renamer}
                    onWorkspaceContextMenu={openWorkspaceMenu}
                    onToggleMulti={toggleMulti}
                    onThreadContextMenu={openMenu}
                    onProjectContextMenu={openProjectMenu}
                    onSelect={onSelect}
                    onCreateChat={onCreateChat}
                    onCreateThread={onCreateThread}
                  />
                ))}
              </div>
            </Section>
          </>
        )}

        {(homeVariant === "distinct" ||
          homeVariant === "flat" ||
          homeVariant === "flat-home-agent" ||
          spaceAgent) && (
          <Section
            label={
              homeVariant === "flat" || spaceAgent
                ? "Chats"
                : homeVariant === "flat-home-agent"
                  ? "Agents"
                  : "Spaces"
            }
            createLabel={
              homeVariant === "distinct"
                ? "New space"
                : homeVariant === "flat-home-agent"
                  ? "New agent"
                  : "New"
            }
            // Distinct's top level holds only spaces; the agent-oriented
            // variants have no space entity in their vocabulary, so their
            // plus only offers chats and agents.
            onCreate={
              homeVariant === "distinct"
                ? onCreateSpace
                : homeVariant === "flat-home-agent"
                  ? () => onCreateProject(HOME_ID)
                  : undefined
            }
            createOptions={
              homeVariant === "flat" || spaceAgent
                ? [
                    { icon: "chat-bubble", label: "New chat", onClick: () => onCreateChat(HOME_ID) },
                    { icon: "agent", label: "New agent", onClick: () => onCreateProject(HOME_ID) },
                  ]
                : undefined
            }
          >
            <div className="flex flex-col gap-px">
              {spaces.map((workspace) =>
                homeVariant === "flat" && workspace.id === HOME_ID ? (
                  // Flat Home: its threads and agents sit directly at the
                  // workspace level, no Home group row. Every project is an
                  // agent — no group distinction.
                  <div key={workspace.id} className="flex flex-col gap-px">
                    <ItemList
                      items={workspace.items}
                      depth={0}
                      projectLeading="face"
                      selectedId={selectedId}
                      multi={multi}
                      dnd={dnd}
                      renamer={renamer}
                      onToggleMulti={toggleMulti}
                      onThreadContextMenu={openMenu}
                      onProjectContextMenu={openProjectMenu}
                      onSelect={onSelect}
                      onCreateThread={onCreateThread}
                    />
                  </div>
                ) : homeVariant === "flat-home-agent" && workspace.id === HOME_ID ? (
                  // Home as an agent: a face row holding Home's chats, with
                  // its agents (e.g. EA) as top-level siblings.
                  <div key={workspace.id} className="flex flex-col gap-px">
                    <ProjectGroup
                      project={{
                        id: workspace.id,
                        name: workspace.name,
                        icon: workspace.icon,
                        messages: workspace.messages,
                        threads: workspace.items.flatMap((i) =>
                          i.kind === "thread" ? [i.thread] : [],
                        ),
                      }}
                      depth={0}
                      leading="face"
                      threadNoun="chat"
                      selectedId={selectedId}
                      multi={multi}
                      dnd={dnd}
                      renamer={renamer}
                      onToggleMulti={toggleMulti}
                      onThreadContextMenu={openMenu}
                      onSelect={onSelect}
                      // The Home row's plus makes a top-level Home chat, not
                      // a project thread (Home is a workspace underneath).
                      onCreateThread={(id) =>
                        id === workspace.id ? onCreateChat(workspace.id) : onCreateThread(id)
                      }
                    />
                    <ItemList
                      items={workspace.items.filter((i) => i.kind === "project")}
                      depth={0}
                      projectLeading="face"
                      selectedId={selectedId}
                      multi={multi}
                      dnd={dnd}
                      renamer={renamer}
                      onToggleMulti={toggleMulti}
                      onThreadContextMenu={openMenu}
                      onProjectContextMenu={openProjectMenu}
                      onSelect={onSelect}
                      onCreateThread={onCreateThread}
                    />
                  </div>
                ) : spaceAgent && workspace.id === HOME_ID ? (
                  // Space-agent Home: its chats and agents (e.g. EA) sit flat
                  // at the top level — no Home row. Agents wear the face like
                  // the space circles beside them.
                  <div key={workspace.id} className="flex flex-col gap-px">
                    <ItemList
                      items={workspace.items}
                      depth={0}
                      projectLeading="face"
                      selectedId={selectedId}
                      multi={multi}
                      dnd={dnd}
                      renamer={renamer}
                      onToggleMulti={toggleMulti}
                      onThreadContextMenu={openMenu}
                      onProjectContextMenu={openProjectMenu}
                      onSelect={onSelect}
                      onCreateThread={onCreateThread}
                    />
                  </div>
                ) : (
                  <WorkspaceGroup
                    key={workspace.id}
                    workspace={workspace}
                    badgeShape={
                      spaceAgent || homeVariant === "flat" || homeVariant === "flat-home-agent"
                        ? "circle"
                        : "chiclet"
                    }
                    // All Spaces and both Agents and Threads variants flatten
                    // the agent/group distinction (every project row wears the
                    // agent face); the space-agent pair shows groups as
                    // folders — chat-able in one, read-only in the other.
                    projectLeading={
                      homeVariant === "space-agent"
                        ? "folder-icon"
                        : homeVariant === "space-agent-readonly"
                          ? "folder"
                          : homeVariant === "distinct" ||
                              homeVariant === "flat" ||
                              homeVariant === "flat-home-agent"
                            ? "face"
                            : "badge"
                    }
                    selectedId={selectedId}
                    multi={multi}
                    dnd={dnd}
                    renamer={renamer}
                    onWorkspaceContextMenu={openWorkspaceMenu}
                    onToggleMulti={toggleMulti}
                    onThreadContextMenu={openMenu}
                    onProjectContextMenu={openProjectMenu}
                    onSelect={onSelect}
                    onCreateChat={onCreateChat}
                    onCreateThread={onCreateThread}
                  />
                ),
              )}
            </div>
          </Section>
        )}

        {homeVariant === "sq" && (
          <Section label="Chats">
            <div className="flex flex-col gap-px">
              {/* No home-level chats — each space is a plain folder of its
                  chats, groups dissolved. */}
              {spaces.map((workspace) => (
                <WorkspaceGroup
                  key={workspace.id}
                  workspace={{ ...workspace, items: flatChats(workspace, true) }}
                  leading="folder"
                  selectedId={selectedId}
                  multi={multi}
                  dnd={dnd}
                  renamer={renamer}
                  onWorkspaceContextMenu={openWorkspaceMenu}
                  onToggleMulti={toggleMulti}
                  onThreadContextMenu={openMenu}
                  onSelect={onSelect}
                  onCreateChat={onCreateChat}
                  onCreateThread={onCreateThread}
                />
              ))}
            </div>
          </Section>
        )}

        {homeVariant === "projects-separate" && (
          <>
            <Section
              label="Projects"
              createLabel="New project"
              onCreate={() => onCreateProject(HOME_ID)}
            >
              <div className="flex flex-col gap-px">
                {/* Every group, from every workspace, hoisted together. This
                    proposal has no agents, so agent projects (e.g. EA) stay
                    out. */}
                <ItemList
                  items={workspaces.flatMap((w) =>
                    w.items.filter((i) => i.kind === "project" && i.project.kind === "group"),
                  )}
                  depth={0}
                  selectedId={selectedId}
                  multi={multi}
                  dnd={dnd}
                  renamer={renamer}
                  onToggleMulti={toggleMulti}
                  onThreadContextMenu={openMenu}
                  onProjectContextMenu={openProjectMenu}
                  onSelect={onSelect}
                  onCreateThread={onCreateThread}
                />
              </div>
            </Section>
            <Section label="Chats">
              <div className="flex flex-col gap-px">
                {/* No home-level chats — only the workspace folders. */}
                {spaces.map((workspace) => (
                  <WorkspaceGroup
                    key={workspace.id}
                    workspace={{ ...workspace, items: flatChats(workspace, false) }}
                    leading="folder"
                    selectedId={selectedId}
                    multi={multi}
                    dnd={dnd}
                    renamer={renamer}
                    onWorkspaceContextMenu={openWorkspaceMenu}
                    onToggleMulti={toggleMulti}
                    onThreadContextMenu={openMenu}
                    onSelect={onSelect}
                    onCreateChat={onCreateChat}
                    onCreateThread={onCreateThread}
                  />
                ))}
              </div>
            </Section>
          </>
        )}

        {homeVariant === "all-projects" && home && (
          <Section
            label="Projects"
            createLabel="New project"
            onCreate={() => onCreateProject(HOME_ID)}
          >
            <div className="flex flex-col gap-px">
              {/* No loose top-level chats — Home surfaces only its projects.
                  Projects hoist out of their workspace and trail it as
                  top-level siblings. This proposal has no agents, so
                  agent projects (e.g. EA) stay out. */}
              <ItemList
                items={home.items.filter(
                  (i) => i.kind === "project" && i.project.kind === "group",
                )}
                depth={0}
                projectLeading="icon"
                selectedId={selectedId}
                multi={multi}
                dnd={dnd}
                renamer={renamer}
                onToggleMulti={toggleMulti}
                onThreadContextMenu={openMenu}
                onProjectContextMenu={openProjectMenu}
                onSelect={onSelect}
                onCreateThread={onCreateThread}
              />
              {spaces.map((workspace) => (
                <Fragment key={workspace.id}>
                  <WorkspaceGroup
                    workspace={{ ...workspace, items: flatChats(workspace, false) }}
                    leading="icon"
                    selectedId={selectedId}
                    multi={multi}
                    dnd={dnd}
                    renamer={renamer}
                    onWorkspaceContextMenu={openWorkspaceMenu}
                    onToggleMulti={toggleMulti}
                    onThreadContextMenu={openMenu}
                    onSelect={onSelect}
                    onCreateChat={onCreateChat}
                    onCreateThread={onCreateThread}
                  />
                  <ItemList
                    items={workspace.items.filter(
                      (i) => i.kind === "project" && i.project.kind === "group",
                    )}
                    depth={0}
                    projectLeading="icon"
                    selectedId={selectedId}
                    multi={multi}
                    dnd={dnd}
                    renamer={renamer}
                    onToggleMulti={toggleMulti}
                    onThreadContextMenu={openMenu}
                    onProjectContextMenu={openProjectMenu}
                    onSelect={onSelect}
                    onCreateThread={onCreateThread}
                  />
                </Fragment>
              ))}
            </div>
          </Section>
        )}

        {homeVariant === "projects-readonly" && (
          <Section label="Chats">
            <div className="flex flex-col gap-px">
              {/* No home-level chats or projects here — only the workspace
                  folders. Projects stay nested in their space's folder but
                  render as read-only folders (toggle, not selectable).
                  Items keep their stored order (chats and groups interleaved)
                  so a freshly grouped folder lands in place — at the slot of
                  the first-selected chat — instead of sinking below the
                  chats. */}
              {spaces.map((workspace) => (
                <WorkspaceGroup
                  key={workspace.id}
                  workspace={{
                    ...workspace,
                    items: workspace.items.flatMap((i): Workspace["items"] =>
                      i.kind === "project"
                        ? [i]
                        : flattenThreads([i.thread])
                            .filter(isListed)
                            .map((thread) => ({
                              kind: "thread" as const,
                              thread: { ...thread, threads: undefined },
                            })),
                    ),
                  }}
                  leading="folder"
                  projectLeading="folder"
                  selectedId={selectedId}
                  multi={multi}
                  dnd={dnd}
                  renamer={renamer}
                  onWorkspaceContextMenu={openWorkspaceMenu}
                  onToggleMulti={toggleMulti}
                  onThreadContextMenu={openMenu}
                  onProjectContextMenu={openProjectMenu}
                  onSelect={onSelect}
                  onCreateChat={onCreateChat}
                  onCreateThread={onCreateThread}
                />
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Context menu for the multi-selection (shift+click or right-click a
          thread). Portaled to the body: the window's backdrop-blur makes it
          the containing block for fixed descendants, which would offset the
          menu from the cursor's viewport coordinates. */}
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 flex min-w-[160px] flex-col rounded-lg bg-elevated p-1 shadow-[0_0_0_1px_var(--border-tertiary),0_4px_12px_rgba(0,0,0,0.15)]"
            style={{ left: menu.x, top: menu.y }}
          >
          {menu.projectId ? (
            <>
              <MenuItem
                icon="pencil"
                label="Rename"
                onClick={() => {
                  setRenamingId(menu.projectId!);
                  setMenu(null);
                }}
              />
              <MenuItem
                icon="trash"
                label="Delete"
                onClick={() => {
                  if (menu.projectId) onDeleteProject(menu.projectId);
                  setMenu(null);
                }}
              />
            </>
          ) : menu.workspaceId ? (
            <MenuItem
              icon="pencil"
              label="Rename"
              onClick={() => {
                setRenamingId(menu.workspaceId!);
                setMenu(null);
              }}
            />
          ) : multi.length >= 2 && homeVariant !== "sq" ? (
            // SQ has no groups, so multi-selections only offer Delete.
            <MenuItem
              icon={AGENT_NOUN_VARIANTS.includes(homeVariant) ? "agent" : "folder"}
              label={
                AGENT_NOUN_VARIANTS.includes(homeVariant)
                  ? "Add to Agent"
                  : homeVariant === "all-projects"
                    ? "Add to Project"
                    : "Add to Group"
              }
              onClick={() => {
                onGroup(multi);
                setMulti([]);
                setMenu(null);
              }}
            />
          ) : (
            <>
              {multi.length === 1 && (
                <MenuItem
                  icon="pencil"
                  label="Rename"
                  onClick={() => {
                    setRenamingId(multi[0]);
                    setMulti([]);
                    setMenu(null);
                  }}
                />
              )}
              <MenuItem
                icon="trash"
                label="Delete"
                onClick={() => {
                  onDelete(multi);
                  setMulti([]);
                  setMenu(null);
                }}
              />
            </>
          )}
          </div>,
          document.body,
        )}
    </aside>
  );
}

/** A context-menu row: icon + label. */
function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm text-primary transition-colors duration-fast hover:bg-quaternary"
    >
      <Icon name={icon} size="sm" color="secondary" />
      {label}
    </button>
  );
}

/** Placeholder row shown when an expanded group has no visible children.
 *  No leading icon box — the text starts at the row's indent edge. */
function EmptyRow({ depth, label = "No Chats" }: { depth: number; label?: string }) {
  return (
    <div
      style={{ paddingLeft: `${depth * 12 + 6}px` }}
      className="flex h-7 items-center pr-1.5"
    >
      <span className="min-w-0 flex-1 truncate pl-0.5 text-base text-quaternary">
        {label}
      </span>
    </div>
  );
}

/** A workspace's items (threads + projects) at a given indent depth. */
function ItemList({
  items,
  depth,
  projectLeading,
  threadNoun,
  selectedId,
  multi,
  dnd,
  renamer,
  onToggleMulti,
  onThreadContextMenu,
  onProjectContextMenu,
  onSelect,
  onCreateThread,
}: {
  items: Workspace["items"];
  depth: number;
  projectLeading?: "badge" | "face" | "dot" | "folder" | "icon" | "folder-icon";
  /** What this layout calls a project's children ("New thread" vs "New
   *  chat"); keeps affordances aligned with the variant's vocabulary. */
  threadNoun?: "thread" | "chat";
  selectedId: string | null;
  multi: string[];
  dnd: Dnd;
  renamer: Renamer;
  onToggleMulti: (id: string) => void;
  onThreadContextMenu: (id: string, e: React.MouseEvent) => void;
  onProjectContextMenu?: (id: string, e: React.MouseEvent) => void;
  onSelect: (id: string) => void;
  onCreateThread: (projectId: string) => void;
}) {
  return (
    <>
      {items.map((item) =>
        item.kind === "thread" ? (
          isListed(item.thread) && (
            <ThreadCell
              key={item.thread.id}
              thread={item.thread}
              depth={depth}
              selectedId={selectedId}
              multi={multi}
              dnd={dnd}
              renamer={renamer}
              onSelect={onSelect}
              onToggleMulti={onToggleMulti}
              onContextMenu={onThreadContextMenu}
            />
          )
        ) : (
          <ProjectGroup
            key={item.project.id}
            project={item.project}
            depth={depth}
            leading={projectLeading}
            threadNoun={threadNoun}
            selectedId={selectedId}
            multi={multi}
            dnd={dnd}
            renamer={renamer}
            onToggleMulti={onToggleMulti}
            onThreadContextMenu={onThreadContextMenu}
            onProjectContextMenu={onProjectContextMenu}
            onSelect={onSelect}
            onCreateThread={onCreateThread}
          />
        ),
      )}
    </>
  );
}

function WorkspaceGroup({
  workspace,
  badgeShape = "chiclet",
  leading = "badge",
  projectLeading,
  threadNoun,
  selectedId,
  multi,
  dnd,
  renamer,
  onToggleMulti,
  onThreadContextMenu,
  onProjectContextMenu,
  onWorkspaceContextMenu,
  onSelect,
  onCreateChat,
  onCreateThread,
}: {
  workspace: Workspace;
  /** Row's identity badge: chiclet by default, circle in "space-agent". */
  badgeShape?: "chiclet" | "circle";
  /** "folder" (SQ family): plain folder glyph, and the whole row toggles
   *  open/closed instead of opening the workspace's chat. "icon": plain
   *  folder glyph too, but with the standard chevron-on-hover toggle and a
   *  selectable row (all-projects). */
  leading?: "badge" | "folder" | "icon";
  /** Passed through to child project rows. */
  projectLeading?: "badge" | "face" | "dot" | "folder" | "icon" | "folder-icon";
  /** Passed through to child project rows. */
  threadNoun?: "thread" | "chat";
  selectedId: string | null;
  multi: string[];
  dnd: Dnd;
  renamer: Renamer;
  onToggleMulti: (id: string) => void;
  onThreadContextMenu: (id: string, e: React.MouseEvent) => void;
  onProjectContextMenu?: (id: string, e: React.MouseEvent) => void;
  onWorkspaceContextMenu?: (id: string, e: React.MouseEvent) => void;
  onSelect: (id: string) => void;
  onCreateChat: (workspaceId: string) => void;
  onCreateThread: (projectId: string) => void;
}) {
  // Workspaces start open so their contents are discoverable; the projects
  // (agents) inside start collapsed.
  const [open, setOpen] = useState(true);
  return (
    // Expanded groups get 8px of breathing room after them, but only between
    // siblings — never stacking against a section boundary (skipped on
    // last-child). Collapsed groups stay 1px from their neighbors.
    <div className={clsx("flex flex-col gap-px", open && "[&:not(:last-child)]:pb-2")}>
      {/* Badge click toggles collapse; the rest of the row opens the
          workspace's main chat (same pattern as project rows). Folder rows
          aren't chats — the whole row toggles instead. */}
      <div
        role="button"
        onClick={
          leading === "folder" ? () => setOpen((o) => !o) : () => onSelect(workspace.id)
        }
        onContextMenu={
          onWorkspaceContextMenu && ((e) => onWorkspaceContextMenu(workspace.id, e))
        }
        {...dropProps(dnd, workspace.id, "workspace")}
        className={clsx(
          DISCLOSURE_GROUP,
          "flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-md px-1.5 text-left transition-colors duration-fast",
          dnd.dropId === workspace.id
            ? "bg-accent-quaternary text-primary"
            : leading !== "folder" && selectedId === workspace.id
              ? "bg-quaternary text-primary"
              : "text-secondary hover:bg-quaternary",
        )}
      >
        {leading === "folder" ? (
          <FolderLeading open={open} />
        ) : leading === "icon" ? (
          <DisclosureIcon
            open={open}
            icon={open ? "folder-open" : "folder"}
            label={workspace.name}
            onToggle={() => setOpen((o) => !o)}
          />
        ) : (
          <DisclosureBadge
            shape={badgeShape}
            icon={workspace.icon}
            label={workspace.name}
            open={open}
            onToggle={() => setOpen((o) => !o)}
          />
        )}
        {renamer.id === workspace.id ? (
          <RenameInput
            initial={workspace.name}
            onCommit={(name) => renamer.commit(workspace.id, name)}
            onCancel={renamer.cancel}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate pl-0.5 text-base">
            {workspace.name}
          </span>
        )}
        {/* Entity rows act directly (create-type menus are reserved for
            section-header pluses). */}
        <CreateButton label="New chat" onClick={() => onCreateChat(workspace.id)} />
      </div>
      {open && (
        <div className="flex flex-col gap-px">
          {workspace.items.some(
            (i) => i.kind === "project" || isListed(i.thread),
          ) ? (
            <ItemList
              items={workspace.items}
              depth={1}
              projectLeading={projectLeading}
              threadNoun={threadNoun}
              selectedId={selectedId}
              multi={multi}
              dnd={dnd}
              renamer={renamer}
              onToggleMulti={onToggleMulti}
              onThreadContextMenu={onThreadContextMenu}
              onProjectContextMenu={onProjectContextMenu}
              onSelect={onSelect}
              onCreateThread={onCreateThread}
            />
          ) : (
            <EmptyRow depth={1} />
          )}
        </div>
      )}
    </div>
  );
}

function ProjectGroup({
  project,
  depth,
  leading = "badge",
  threadNoun = "thread",
  selectedId,
  multi,
  dnd,
  renamer,
  onToggleMulti,
  onThreadContextMenu,
  onProjectContextMenu,
  onSelect,
  onCreateThread,
}: {
  project: Project;
  depth: number;
  /** Row's leading treatment: identity badge (face for agents, circle for
   *  groups), "face" forcing the agent face on every project (layouts with
   *  no agent/group distinction), the thread-style dot, a read-only folder
   *  (whole row toggles instead of opening the project's chat), a plain
   *  un-circled icon with the chevron-on-hover toggle ("all-projects"), or a
   *  chat-able folder glyph with the same chevron toggle ("space-agent"). */
  leading?: "badge" | "face" | "dot" | "folder" | "icon" | "folder-icon";
  /** What this layout calls the project's children; drives the create
   *  tooltip and empty state. */
  threadNoun?: "thread" | "chat";
  selectedId: string | null;
  multi: string[];
  dnd: Dnd;
  renamer: Renamer;
  onToggleMulti: (id: string) => void;
  onThreadContextMenu: (id: string, e: React.MouseEvent) => void;
  onProjectContextMenu?: (id: string, e: React.MouseEvent) => void;
  onSelect: (id: string) => void;
  onCreateThread: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const listedThreads = project.threads.filter(isListed);
  const nounLabels =
    threadNoun === "chat"
      ? { create: "New chat", empty: "No Chats" }
      : { create: "New thread", empty: "No Threads" };
  return (
    // Between-siblings breathing room when expanded; see WorkspaceGroup.
    <div className={clsx("flex flex-col gap-px", open && "[&:not(:last-child)]:pb-2")}>
      <Cell
        depth={depth}
        variant="project"
        selected={leading !== "folder" && selectedId === project.id}
        // Drag source (reparent into another space) and drop target for
        // threads. Dragging pauses while the row is being renamed so text
        // selection inside the input doesn't start a row drag.
        dragProps={{
          ...(renamer.id === project.id
            ? {}
            : dragSourceProps(dnd, "project", project.id)),
          ...dropProps(dnd, project.id, "project"),
        }}
        dropActive={dnd.dropId === project.id}
        // Read-only folders toggle on row click instead of opening a chat.
        onClick={
          leading === "folder" ? () => setOpen((o) => !o) : () => onSelect(project.id)
        }
        onContextMenu={onProjectContextMenu && ((e) => onProjectContextMenu(project.id, e))}
      >
        {/* Badge/dot click toggles collapse; the rest of the row selects. */}
        {leading === "badge" || leading === "face" ? (
          <DisclosureBadge
            // Agents wear the eyed face; ad-hoc groups keep the plain circle
            // unless the layout erases the distinction ("face").
            shape={leading === "badge" && project.kind === "group" ? "circle" : "face"}
            icon={project.icon}
            label={project.name}
            open={open}
            onToggle={() => setOpen((o) => !o)}
          />
        ) : leading === "folder" ? (
          <FolderLeading open={open} />
        ) : leading === "icon" || leading === "folder-icon" ? (
          <DisclosureIcon
            open={open}
            icon={leading === "folder-icon" ? (open ? "folder-open" : "folder") : project.icon}
            label={project.name}
            onToggle={() => setOpen((o) => !o)}
          />
        ) : (
          <DisclosureDot open={open} hasChevron onToggle={() => setOpen((o) => !o)} />
        )}
        {renamer.id === project.id ? (
          <RenameInput
            initial={project.name}
            onCommit={(name) => renamer.commit(project.id, name)}
            onCancel={renamer.cancel}
          />
        ) : (
          <Label text={project.name} />
        )}
        {/* Read-only only means not chat-able; creating children is fine. */}
        <CreateButton label={nounLabels.create} onClick={() => onCreateThread(project.id)} />
      </Cell>
      {open && (
        <div className="flex flex-col gap-px">
          {listedThreads.length > 0 ? (
            listedThreads.map((thread) => (
              <ThreadCell
                key={thread.id}
                thread={thread}
                depth={depth + 1}
                selectedId={selectedId}
                multi={multi}
                dnd={dnd}
                renamer={renamer}
                onSelect={onSelect}
                onToggleMulti={onToggleMulti}
                onContextMenu={onThreadContextMenu}
              />
            ))
          ) : (
            <EmptyRow depth={depth + 1} label={nounLabels.empty} />
          )}
        </div>
      )}
    </div>
  );
}

function ThreadCell({
  thread,
  depth,
  selectedId,
  multi,
  dnd,
  renamer,
  onSelect,
  onToggleMulti,
  onContextMenu,
}: {
  thread: Thread;
  depth: number;
  selectedId: string | null;
  multi: string[];
  dnd: Dnd;
  renamer: Renamer;
  onSelect: (id: string) => void;
  onToggleMulti?: (id: string) => void;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
}) {
  // Subthreads (threads in threads) start collapsed, like projects.
  const [open, setOpen] = useState(false);
  const subthreads = (thread.threads ?? []).filter(isListed);
  const hasChildren = subthreads.length > 0;
  return (
    // Between-siblings breathing room when expanded; see WorkspaceGroup.
    <div
      className={clsx(
        "flex flex-col gap-px",
        open && hasChildren && "[&:not(:last-child)]:pb-2",
      )}
    >
      <Cell
        depth={depth}
        variant="thread"
        dataThreadId={thread.id}
        selected={selectedId === thread.id}
        multiSelected={multi.includes(thread.id)}
        // Drag source, and drop target for grouping with this thread.
        // Dragging pauses while the row is being renamed.
        dragProps={{
          ...(renamer.id === thread.id ? {} : dragSourceProps(dnd, "thread", thread.id)),
          ...dropProps(dnd, thread.id, "thread"),
        }}
        dropActive={dnd.dropId === thread.id}
        onClick={(e) => {
          // Shift+click range-selects up to this thread and opens the menu;
          // cmd/ctrl+click toggles just this thread.
          if (onContextMenu && e.shiftKey) {
            onContextMenu(thread.id, e);
          } else if (onToggleMulti && (e.metaKey || e.ctrlKey)) {
            onToggleMulti(thread.id);
          } else {
            onSelect(thread.id);
          }
        }}
        onContextMenu={onContextMenu && ((e) => onContextMenu(thread.id, e))}
      >
        <DisclosureDot
          open={open}
          hasChevron={hasChildren}
          onToggle={() => setOpen((o) => !o)}
        />
        {renamer.id === thread.id ? (
          <RenameInput
            initial={thread.title}
            onCommit={(name) => renamer.commit(thread.id, name)}
            onCancel={renamer.cancel}
          />
        ) : (
          <Label text={thread.title} />
        )}
      </Cell>
      {open && hasChildren && (
        <div className="flex flex-col gap-px">
          {subthreads.map((sub) => (
            <ThreadCell
              key={sub.id}
              thread={sub}
              depth={depth + 1}
              selectedId={selectedId}
              multi={multi}
              dnd={dnd}
              renamer={renamer}
              onSelect={onSelect}
              onToggleMulti={onToggleMulti}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Utility row (Search / New Agent / ...): 20px leading icon box so the
 *  label lines up with the dot and badge cells below. Inert without onClick. */
function ActionCell({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 items-center gap-1.5 rounded-md px-1.5 text-left text-secondary transition-colors duration-fast hover:bg-quaternary"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon name={icon} size="base" color="secondary" />
      </span>
      <span className="min-w-0 flex-1 truncate pl-0.5 text-base">{label}</span>
    </button>
  );
}

/** Row-hover plus affordance. Rendered as a span (rows are already buttons)
 *  and revealed via the row's disclosure group hover. Containers that accept
 *  multiple entity types pass `options`; clicking then opens a menu of what
 *  can be created instead of acting directly. */
function CreateButton({
  label,
  onClick,
  options,
}: {
  label: string;
  onClick?: () => void;
  options?: CreateOption[];
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!menuPos) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      setMenuPos(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuPos]);
  const hasMenu = (options?.length ?? 0) > 1;
  return (
    <span
      ref={anchorRef}
      role="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        if (!hasMenu) {
          (onClick ?? options?.[0]?.onClick)?.();
          return;
        }
        const rect = anchorRef.current!.getBoundingClientRect();
        setMenuPos((p) => (p ? null : { x: rect.right, y: rect.bottom + 4 }));
      }}
      className={clsx(
        "ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-opacity duration-fast hover:bg-tertiary group-hover/disclosure:opacity-100",
        // Keep the plus visible (not hover-gated) while its menu is open.
        menuPos ? "bg-tertiary opacity-100" : "opacity-0",
      )}
    >
      <Icon name="plus" size="sm" color="secondary" />
      {menuPos &&
        createPortal(
          // Right-aligned under the plus (it hugs the sidebar's right edge).
          // Portaled to the body like the context menu — the window's
          // backdrop-blur would otherwise offset fixed positioning.
          <div
            ref={menuRef}
            className="fixed z-50 flex min-w-[160px] flex-col rounded-lg bg-elevated p-1 shadow-[0_0_0_1px_var(--border-tertiary),0_4px_12px_rgba(0,0,0,0.15)]"
            style={{ left: menuPos.x, top: menuPos.y, transform: "translateX(-100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {options!.map((option) => (
              <MenuItem
                key={option.label}
                icon={option.icon}
                label={option.label}
                onClick={() => {
                  setMenuPos(null);
                  option.onClick();
                }}
              />
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** Overflow fades out via a right-edge mask instead of an ellipsis (from
 *  cursor-neue's SidebarCell). */
function Label({ text }: { text: string }) {
  return (
    <span
      className="min-w-0 flex-1 overflow-hidden whitespace-nowrap pl-0.5 text-base"
      style={{
        maskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
        WebkitMaskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
      }}
    >
      {text}
    </span>
  );
}

function Cell({
  depth,
  variant,
  dataThreadId,
  selected,
  multiSelected = false,
  dragProps,
  dropActive = false,
  onClick,
  onContextMenu,
  children,
}: {
  depth: number;
  variant: "project" | "thread";
  /** Marks the row for DOM-order lookups (shift+click range selection). */
  dataThreadId?: string;
  selected: boolean;
  multiSelected?: boolean;
  /** Drag-source and/or drop-target listeners, spread onto the row. */
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Row is the hovered target of a valid drag. */
  dropActive?: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  // A div (not a button) so inline-rename inputs can live inside the row.
  return (
    <div
      role="button"
      data-thread-id={dataThreadId}
      onClick={onClick}
      onContextMenu={onContextMenu}
      {...dragProps}
      // Indent via padding so the hover/selected highlight spans full width.
      style={{ paddingLeft: `${depth * 12 + 6}px` }}
      className={clsx(
        // Both variants host hover-revealed affordances (disclosure swap,
        // create plus), so both carry the group marker.
        DISCLOSURE_GROUP,
        // Both variants share the 20px leading box + 6px gap so labels stay
        // flush across dot cells and badge cells.
        "flex cursor-pointer select-none items-center gap-1.5 pr-1.5 text-left transition-colors duration-fast",
        variant === "thread" ? "h-[30px] rounded-lg" : "h-7 rounded-md",
        dropActive || multiSelected
          ? "bg-accent-quaternary text-primary"
          : selected
            ? "bg-quaternary text-primary"
            : "text-secondary hover:bg-quaternary",
      )}
    >
      {children}
    </div>
  );
}
