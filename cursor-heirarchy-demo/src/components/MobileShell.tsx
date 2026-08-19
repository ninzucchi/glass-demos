import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChatView, Timeline } from "./ChatPanel";
import {
  AGENT_NOUN_VARIANTS,
  flatChats,
  isListed,
  type HomeVariant,
} from "./Sidebar";
import { Icon, type IconName } from "./ui/Icon";
import { LeadingBadge } from "./ui/LeadingBadge";
import { MobileNavBar, type NavAction } from "./ui/MobileNavBar";
import { flattenThreads } from "../data";
import type {
  Message,
  Project,
  SelectionPath,
  Thread,
  ViewMode,
  Workspace,
} from "../types";

const HOME_ID = "ws-home";

/** Spaces rendered as non-chat-able folders in the desktop sidebar; on
 *  mobile they push a child list instead of a main chat. */
const FOLDER_SPACES: HomeVariant[] = ["sq", "projects-separate", "projects-readonly"];
/** Variants whose group projects are read-only (no main chat). */
const READONLY_GROUPS: HomeVariant[] = ["projects-readonly", "space-agent-readonly"];
/** Variants that hoist projects to the top level, so a project pushes
 *  directly over the home list (no space screen in between). */
const HOISTED_PROJECTS: HomeVariant[] = ["projects-separate", "all-projects"];
/** Variants whose spaces wear circles instead of chiclets (mirrors App). */
const CIRCLE_SPACES: HomeVariant[] = [
  "flat",
  "flat-home-agent",
  "space-agent",
  "space-agent-readonly",
];

interface BadgeSpec {
  shape: "chiclet" | "circle" | "face";
  icon?: IconName;
}

/** One tappable row in the home list, a child-list screen, or a sheet. */
interface Row {
  id: string;
  title: string;
  leading: BadgeSpec | { shape: "dot" } | { shape: "folder" };
  /** Containers get a trailing chevron. */
  container?: boolean;
}

/** Everything a pushed chat screen needs, captured eagerly so a popped
 *  screen can keep rendering while it slides out. */
interface ChatData {
  id: string;
  title: string;
  subtitle?: string;
  badge?: BadgeSpec;
  messages: Message[];
  threads: Thread[];
  groupCreatedAt?: string;
  quote?: string;
  /** Children shown by the nav bar's list button (chat-able containers). */
  sheet?: { title: string; rows: Row[] };
  /** Trailing plus target; absent on leaf thread screens. */
  create?: { kind: "chat" | "thread"; targetId: string };
}

type Screen =
  | { kind: "home"; key: string; id: null }
  | { kind: "list"; key: string; id: string; title: string; rows: Row[] }
  | { kind: "chat"; key: string; id: string; chat: ChatData };

const isReadonlyGroup = (variant: HomeVariant, p: Project) =>
  READONLY_GROUPS.includes(variant) && p.kind === "group";

/** Face for agents (and for every project in the agent-noun layouts),
 *  plain circle for ad-hoc groups elsewhere — mirrors the desktop badges. */
const projectShape = (variant: HomeVariant, p: Project): BadgeSpec["shape"] =>
  AGENT_NOUN_VARIANTS.includes(variant) || p.kind !== "group" ? "face" : "circle";

const threadRow = (t: Thread): Row => ({ id: t.id, title: t.title, leading: { shape: "dot" } });

const projectRow = (variant: HomeVariant, p: Project): Row => ({
  id: p.id,
  title: p.name,
  leading: isReadonlyGroup(variant, p)
    ? { shape: "folder" }
    : { shape: projectShape(variant, p), icon: p.icon },
  container: true,
});

const spaceRow = (variant: HomeVariant, w: Workspace): Row => ({
  id: w.id,
  title: w.name,
  leading: FOLDER_SPACES.includes(variant)
    ? { shape: "folder" }
    : { shape: CIRCLE_SPACES.includes(variant) ? "circle" : "chiclet", icon: w.icon },
  container: true,
});

const itemRow = (variant: HomeVariant, item: Workspace["items"][number]): Row[] =>
  item.kind === "thread"
    ? isListed(item.thread)
      ? [threadRow(item.thread)]
      : []
    : [projectRow(variant, item.project)];

/** The home screen's sections: the desktop sidebar's top-level structure per
 *  variant, flattened — no disclosure, containers push instead. */
function homeSections(
  workspaces: Workspace[],
  variant: HomeVariant,
): { label: string; rows: Row[] }[] {
  const home = workspaces.find((w) => w.id === HOME_ID);
  const spaces = workspaces.filter((w) => w.id !== HOME_ID);
  const sections: { label: string; rows: Row[] }[] = [];

  const pinned = workspaces
    .flatMap((w) =>
      w.items.flatMap((i) =>
        flattenThreads(i.kind === "thread" ? [i.thread] : i.project.threads),
      ),
    )
    .filter((t) => t.pinned);
  if (pinned.length > 0) sections.push({ label: "Pinned", rows: pinned.map(threadRow) });

  switch (variant) {
    case "sections":
      sections.push({
        label: "Home",
        rows: home
          ? [
              ...home.items.filter((i) => i.kind === "project").flatMap((i) => itemRow(variant, i)),
              ...home.items.filter((i) => i.kind === "thread").flatMap((i) => itemRow(variant, i)),
            ]
          : [],
      });
      sections.push({ label: "Spaces", rows: spaces.map((w) => spaceRow(variant, w)) });
      break;
    case "distinct":
      sections.push({ label: "Spaces", rows: workspaces.map((w) => spaceRow(variant, w)) });
      break;
    case "flat":
    case "space-agent":
    case "space-agent-readonly":
      sections.push({
        label: "Chats",
        rows: [
          ...(home?.items.flatMap((i) => itemRow(variant, i)) ?? []),
          ...spaces.map((w) => spaceRow(variant, w)),
        ],
      });
      break;
    case "flat-home-agent":
      sections.push({
        label: "Agents",
        rows: [
          ...(home
            ? [
                {
                  id: home.id,
                  title: home.name,
                  leading: { shape: "face" as const },
                  container: true,
                },
                ...home.items
                  .filter((i) => i.kind === "project")
                  .flatMap((i) => itemRow(variant, i)),
              ]
            : []),
          ...spaces.map((w) => spaceRow(variant, w)),
        ],
      });
      break;
    case "sq":
    case "projects-readonly":
      // Folder spaces aren't chat-able, so instead of drilling into a pushed
      // list, each space flattens into a home section (like the sidebar's
      // folders); only its read-only groups still push.
      for (const w of spaces) {
        sections.push({ label: w.name, rows: workspaceListRows(variant, w) });
      }
      break;
    case "projects-separate":
      sections.push({
        label: "Projects",
        rows: workspaces.flatMap((w) =>
          w.items.flatMap((i) =>
            i.kind === "project" && i.project.kind === "group" ? [projectRow(variant, i.project)] : [],
          ),
        ),
      });
      // Folder spaces flatten into sections (see sq above).
      for (const w of spaces) {
        sections.push({ label: w.name, rows: workspaceListRows(variant, w) });
      }
      break;
    case "all-projects":
      // Every project hoists into one flat run of siblings (a group created
      // from a space's chats owes it nothing); space folders trail them.
      sections.push({
        label: "Projects",
        rows: [
          ...workspaces.flatMap((w) =>
            w.items.flatMap((i) =>
              i.kind === "project" && i.project.kind === "group"
                ? [projectRow(variant, i.project)]
                : [],
            ),
          ),
          ...spaces.map((w) => spaceRow(variant, w)),
        ],
      });
      break;
  }
  return sections;
}

/** Child rows for a folder-space's pushed list screen. */
function workspaceListRows(variant: HomeVariant, w: Workspace): Row[] {
  if (variant === "projects-readonly") {
    // Items keep stored order: chats flattened to leaves, groups as folders.
    return w.items.flatMap((i) =>
      i.kind === "project"
        ? [projectRow(variant, i.project)]
        : flattenThreads([i.thread]).filter(isListed).map(threadRow),
    );
  }
  return flatChats(w, variant === "sq").flatMap((i) => itemRow(variant, i));
}

function workspaceChat(variant: HomeVariant, w: Workspace): ChatData {
  const threads = w.items.flatMap((i) => (i.kind === "thread" ? [i.thread] : []));
  const sheetRows = w.items.flatMap((i) => itemRow(variant, i));
  return {
    id: w.id,
    title: w.name,
    badge: {
      shape: CIRCLE_SPACES.includes(variant) ? "circle" : "chiclet",
      icon: w.icon,
    },
    messages: w.messages,
    threads,
    sheet: sheetRows.length > 0 ? { title: w.name, rows: sheetRows } : undefined,
    create: { kind: "chat", targetId: w.id },
  };
}

function projectChat(variant: HomeVariant, p: Project, w: Workspace): ChatData {
  const listed = p.threads.filter(isListed);
  return {
    id: p.id,
    title: p.name,
    subtitle: w.id === HOME_ID ? undefined : w.name,
    badge: { shape: projectShape(variant, p), icon: p.icon },
    messages: p.messages,
    threads: p.threads,
    groupCreatedAt: p.createdAt,
    sheet: listed.length > 0 ? { title: p.name, rows: listed.map(threadRow) } : undefined,
    create: { kind: "thread", targetId: p.id },
  };
}

function threadChat(t: Thread, parentTitle: string): ChatData {
  return {
    id: t.id,
    title: t.title,
    subtitle: parentTitle,
    messages: t.messages,
    threads: t.threads ?? [],
    quote: t.excerpt,
  };
}

/** Translates the selection's hierarchy path into a push stack: home list at
 *  the root, then a screen per ancestor container, then the thread chain.
 *  Home's own contents live at the root, so they push with no Home screen in
 *  between; hoisted-project variants skip the space screen the same way. */
function deriveScreens(
  variant: HomeVariant,
  path: SelectionPath | undefined,
  selectedId: string | null,
): Screen[] {
  const screens: Screen[] = [{ kind: "home", key: "home", id: null }];
  if (!path || !selectedId) return screens;
  const { workspace, project } = path;
  const threadPath = path.threadPath ?? [];

  const includeWorkspace =
    workspace.id === selectedId ||
    (workspace.id !== HOME_ID &&
      // Folder spaces flatten into home sections, so their contents push
      // with no space screen in between (same as hoisted projects).
      !FOLDER_SPACES.includes(variant) &&
      !(project && HOISTED_PROJECTS.includes(variant)));
  if (includeWorkspace) {
    screens.push(
      FOLDER_SPACES.includes(variant)
        ? {
            kind: "list",
            key: `list-${workspace.id}`,
            id: workspace.id,
            title: workspace.name,
            rows: workspaceListRows(variant, workspace),
          }
        : {
            kind: "chat",
            key: `chat-${workspace.id}`,
            id: workspace.id,
            chat: workspaceChat(variant, workspace),
          },
    );
  }
  if (project) {
    screens.push(
      isReadonlyGroup(variant, project)
        ? {
            kind: "list",
            key: `list-${project.id}`,
            id: project.id,
            title: project.name,
            rows: flattenThreads(project.threads).filter(isListed).map(threadRow),
          }
        : {
            kind: "chat",
            key: `chat-${project.id}`,
            id: project.id,
            chat: projectChat(variant, project, workspace),
          },
    );
  }
  let parentTitle = project?.name ?? workspace.name;
  for (const t of threadPath) {
    screens.push({ kind: "chat", key: `chat-${t.id}`, id: t.id, chat: threadChat(t, parentTitle) });
    parentTitle = t.title;
  }
  return screens;
}

/** Keeps popped screens rendered (sliding out) until the exit transition
 *  finishes. Pops are detected synchronously during render — the shrunk
 *  stack must never paint a frame without the departing screen. */
function useExitingScreens(screens: Screen[]): Screen[] {
  const sig = screens.map((s) => s.key).join("|");
  const prevRef = useRef<{ sig: string; screens: Screen[] }>({ sig, screens });
  const [exit, setExit] = useState<{ sig: string; screens: Screen[] }>({ sig, screens: [] });
  if (sig !== prevRef.current.sig) {
    const prev = prevRef.current.screens;
    const isPop =
      prev.length > screens.length && screens.every((s, i) => s.key === prev[i]?.key);
    setExit({ sig, screens: isPop ? prev.slice(screens.length) : [] });
    prevRef.current = { sig, screens };
  } else {
    prevRef.current = { sig, screens };
  }
  useEffect(() => {
    if (exit.screens.length === 0) return;
    const timer = setTimeout(() => setExit((e) => ({ ...e, screens: [] })), 240);
    return () => clearTimeout(timer);
  }, [exit.sig, exit.screens.length]);
  return exit.screens;
}

/** How a top-level container exposes its child index: the nav bar's list
 *  button opening a sheet, or a footer capsule swapping the whole screen
 *  between the main chat and the index. */
export type IndexStyle = "sheet" | "footer";

interface ShellHandlers {
  drafts: Record<string, string>;
  onDraftChange: (targetId: string, text: string) => void;
  onSelect: (id: string, mode?: ViewMode) => void;
  onCreateChat: (
    workspaceId: string,
    mode?: ViewMode,
    parentMessageId?: string,
    excerpt?: string,
  ) => void;
  onCreateThread: (
    containerId: string,
    mode?: ViewMode,
    parentMessageId?: string,
    excerpt?: string,
  ) => void;
  onSendMessage: (targetId: string, text: string) => void;
}

/** The phone's screen: a push-navigation stack over the same hierarchy the
 *  desktop window shows. The home list is the root; containers and threads
 *  push over it, the list parallaxing back iOS-style. */
export function MobileShell({
  workspaces,
  homeVariant,
  indexStyle,
  path,
  selectedId,
  onPopToRoot,
  ...handlers
}: ShellHandlers & {
  workspaces: Workspace[];
  homeVariant: HomeVariant;
  indexStyle: IndexStyle;
  path: SelectionPath | undefined;
  selectedId: string | null;
  /** Clears the selection, popping the whole stack back to the home list. */
  onPopToRoot: () => void;
}) {
  const screens = deriveScreens(homeVariant, path, selectedId);
  const exiting = useExitingScreens(screens);
  const rendered = [...screens, ...exiting];
  const topIndex = screens.length - 1;

  const backFrom = (index: number) => {
    const target = index > 1 ? screens[index - 1] : undefined;
    if (target?.id) handlers.onSelect(target.id);
    else onPopToRoot();
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-sidebar">
      {rendered.map((screen, i) => {
        const isExiting = i > topIndex;
        return (
          <div
            key={screen.key}
            className={clsx(
              "absolute inset-0 flex flex-col overflow-hidden transition-transform duration-slow [transition-timing-function:var(--ease-default)]",
              screen.kind === "home" ? "bg-sidebar" : "bg-chrome shadow-window",
              i > 0 && "animate-screen-push",
            )}
            style={{
              transform: isExiting
                ? "translateX(100%)"
                : i < topIndex
                  ? "translateX(-25%)"
                  : "translateX(0)",
            }}
          >
            {screen.kind === "home" ? (
              <MobileHome
                sections={homeSections(workspaces, homeVariant)}
                onSelect={handlers.onSelect}
                onCreateChat={handlers.onCreateChat}
              />
            ) : screen.kind === "list" ? (
              <MobileListScreen
                title={screen.title}
                rows={screen.rows}
                onBack={() => backFrom(i)}
                onSelect={handlers.onSelect}
              />
            ) : (
              <MobileChatScreen
                chat={screen.chat}
                onBack={() => backFrom(i)}
                // The footer index swap applies only to the top-most pushed
                // entity; deeper containers keep the sheet toolbar approach.
                footerIndex={indexStyle === "footer" && i === 1 && !!screen.chat.sheet}
                {...handlers}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Root screen: search in the nav bar, the flattened hierarchy sections,
 *  and the floating New Thread pill over a gradient footer. */
function MobileHome({
  sections,
  onSelect,
  onCreateChat,
}: {
  sections: { label: string; rows: Row[] }[];
  onSelect: (id: string) => void;
  onCreateChat: (workspaceId: string) => void;
}) {
  return (
    <div className="relative flex h-full flex-col">
      <MobileNavBar trailing={[{ icon: "magnifying-glass", label: "Search" }]} />
      <div className="scrollbar-overlay flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 pb-28 pt-1">
        {sections.map((section, i) => (
          // Space-name sections can collide (duplicate names), so key by slot.
          <section key={`${i}-${section.label}`} className="flex flex-col gap-1">
            <h2 className="px-2 text-sm font-medium text-quaternary">{section.label}</h2>
            <div className="flex flex-col">
              {section.rows.map((row) => (
                <MobileRow key={row.id} row={row} onTap={() => onSelect(row.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
      {/* Gradient footer keeps the pill legible over the scrolling list. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-sidebar via-sidebar/85 to-transparent px-4 pb-5 pt-12">
        <button
          type="button"
          onClick={() => onCreateChat(HOME_ID)}
          className="pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-elevated pl-4 pr-5 text-lg font-medium text-primary shadow-[var(--cursor-box-shadow-lg)] transition-colors duration-fast hover:bg-quaternary-opaque"
        >
          <Icon name="pencil-square" size="lg" color="primary" />
          New Thread
        </button>
      </div>
    </div>
  );
}

/** Pushed child list for non-chat-able containers (folder spaces and
 *  read-only groups). */
function MobileListScreen({
  title,
  rows,
  onBack,
  onSelect,
}: {
  title: string;
  rows: Row[];
  onBack: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <MobileNavBar leading={[{ icon: "chevron-left", label: "Back", onClick: onBack }]} title={title} />
      <div className="scrollbar-overlay flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-6 pt-1">
        {rows.map((row) => (
          <MobileRow key={row.id} row={row} onTap={() => onSelect(row.id)} />
        ))}
      </div>
    </>
  );
}

/** Pushed chat screen: mobile nav bar over the shared ChatView body. The
 *  nav's list button opens the container's children as a sheet; its plus
 *  creates a chat/thread inside the entity. */
function MobileChatScreen({
  chat,
  onBack,
  footerIndex = false,
  drafts,
  onDraftChange,
  onSelect,
  onCreateChat,
  onCreateThread,
  onSendMessage,
}: ShellHandlers & {
  chat: ChatData;
  onBack: () => void;
  /** Footer capsule swaps this screen between chat and child index, instead
   *  of the nav bar's sheet button. */
  footerIndex?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // Footer-index screens land on the child index; the capsule swaps to chat.
  const [view, setView] = useState<"chat" | "index">(footerIndex ? "index" : "chat");
  const showIndex = footerIndex && view === "index" && !!chat.sheet;

  // Reply in this chat spawns (or reopens) a thread anchored to the message;
  // the selection change pushes its screen.
  const reply = (messageId?: string, excerpt?: string) => {
    const existing = messageId
      ? chat.threads.find((t) => t.parentMessageId === messageId)
      : undefined;
    if (existing) onSelect(existing.id, "split");
    else if (chat.create?.kind === "chat") onCreateChat(chat.id, "split", messageId, excerpt);
    else onCreateThread(chat.id, "split", messageId, excerpt);
  };

  const leading: NavAction[] = [{ icon: "chevron-left", label: "Back", onClick: onBack }];
  if (chat.sheet && !footerIndex) {
    leading.push({ icon: "list-bullets", label: "Threads", onClick: () => setSheetOpen(true) });
  }

  return (
    <>
      <MobileNavBar
        leading={leading}
        title={chat.title}
        subtitle={chat.subtitle}
        badge={chat.badge}
        trailing={[
          chat.create
            ? {
                icon: "plus",
                label: chat.create.kind === "chat" ? "New chat" : "New thread",
                onClick: () =>
                  chat.create!.kind === "chat"
                    ? onCreateChat(chat.create!.targetId)
                    : onCreateThread(chat.create!.targetId),
              }
            : { icon: "dots-3-horizontal", label: "More" },
        ]}
      />
      {showIndex ? (
        // Child index takes over the screen (footer approach's list mode).
        <div className="scrollbar-overlay flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-2 pt-1">
          {chat.sheet!.rows.map((row) => (
            <MobileRow key={row.id} row={row} onTap={() => onSelect(row.id)} />
          ))}
        </div>
      ) : (
        <ChatView
          hideHeader
          footerFade
          title={chat.title}
          className="min-h-0 flex-1"
          // Mobile skips the centered new-chat composer (desktop-only):
          // empty chats open straight to the bottom composer.
          context={chat.subtitle ?? chat.title}
          quote={chat.quote}
          draft={drafts[chat.id] ?? ""}
          onDraftChange={(text) => onDraftChange(chat.id, text)}
          onSend={(text) => onSendMessage(chat.id, text)}
        >
          {/* No cursor on mobile, so instead of the selection-anchored
              "Reply in Thread" pill, tapping a message replies in (or
              reopens) its thread via push. Pills and cards are buttons and
              handle themselves. */}
          <div
            onClick={(e) => {
              const target = e.target as Element;
              if (target.closest("button")) return;
              const id = target
                .closest("[data-message-id]")
                ?.getAttribute("data-message-id");
              if (id) reply(id);
            }}
            className="flex flex-col gap-3"
          >
            <Timeline
              messages={chat.messages}
              threads={chat.threads}
              groupCreatedAt={chat.groupCreatedAt}
              drafts={drafts}
              onOpenThread={(id) => onSelect(id)}
            />
          </div>
        </ChatView>
      )}
      {footerIndex && chat.sheet && (
        // Footer capsule: swaps between the entity's child index and its
        // main chat (the mock's bottom toggle).
        <div className="flex shrink-0 justify-center pb-3 pt-1.5">
          <div className="flex rounded-full bg-quaternary p-0.5 shadow-[var(--cursor-box-shadow-sm)]">
            <FooterSegment
              icon="list-bullets"
              label="Index"
              active={view === "index"}
              onClick={() => setView("index")}
            />
            <FooterSegment
              icon="chat-bubble"
              label="Chat"
              active={view === "chat"}
              onClick={() => setView("chat")}
            />
          </div>
        </div>
      )}
      {sheetOpen && chat.sheet && (
        <MobileSheet
          title={chat.sheet.title}
          rows={chat.sheet.rows}
          onPick={(id) => {
            setSheetOpen(false);
            onSelect(id);
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}

/** One icon segment of the footer index/chat capsule. */
function FooterSegment({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "flex h-9 w-14 items-center justify-center rounded-full transition-colors duration-fast",
        active ? "bg-elevated shadow-sm" : "hover:bg-quaternary",
      )}
    >
      <Icon name={icon} size="lg" color={active ? "primary" : "secondary"} />
    </button>
  );
}

/** Bottom sheet listing a chat-able container's children (the mock's list
 *  toolbar affordance). Tapping a row pushes it. */
function MobileSheet({
  title,
  rows,
  onPick,
  onClose,
}: {
  title: string;
  rows: Row[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-scrim-fade absolute inset-0 bg-black/25"
      />
      <div className="animate-sheet-rise absolute inset-x-0 bottom-0 flex max-h-[70%] flex-col rounded-t-2xl bg-elevated pb-4 shadow-[var(--cursor-box-shadow-lg)]">
        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <span className="text-lg font-medium text-primary">{title}</span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-quaternary transition-colors duration-fast hover:bg-quaternary-opaque"
          >
            <Icon name="x" size="sm" color="secondary" />
          </button>
        </div>
        <div className="scrollbar-overlay flex min-h-0 flex-1 flex-col overflow-y-auto px-2">
          {rows.map((row) => (
            <MobileRow key={row.id} row={row} onTap={() => onPick(row.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 44px single-line list row: identity leading, title, trailing chevron on
 *  containers. */
function MobileRow({ row, onTap }: { row: Row; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex h-11 items-center gap-2.5 rounded-lg px-2 text-left transition-colors duration-fast hover:bg-quaternary"
    >
      {row.leading.shape === "dot" ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <span className="h-[7px] w-[7px] rounded-full bg-tertiary" />
        </span>
      ) : row.leading.shape === "folder" ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon name="folder" size="base" color="secondary" />
        </span>
      ) : (
        <LeadingBadge shape={row.leading.shape} icon={row.leading.icon} label={row.title} />
      )}
      <span className="min-w-0 flex-1 truncate text-base text-primary">{row.title}</span>
      {row.container && <Icon name="chevron-right" size="sm" color="quaternary" />}
    </button>
  );
}
