import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Icon, type IconName } from "./ui/Icon";
import { LeadingBadge } from "./ui/LeadingBadge";
import type { Message, SelectionPath, Thread, ViewMode, Workspace } from "../types";

/** Shared transcript column: centered, capped at chat reading width (from
 *  cursor-neue's ChatBody). */
const COLUMN = "mx-auto w-full max-w-[640px] px-3";

/** Minimum panel width for the side-by-side split (parent ~500px + thread
 *  ~360px). Below this, an open thread takes over the pane instead. */
const SPLIT_MIN_WIDTH = 860;

/** Home is the default surface, not a user-created container, so its empty
 *  chat skips the big-entity setup pills. Mirrors Sidebar's HOME_ID. */
const HOME_ID = "ws-home";

/** Space dropdown on the composer's context chip: picking a space moves the
 *  open chat there. */
interface SpacePicker {
  options: Pick<Workspace, "id" | "name" | "icon">[];
  currentId: string;
  /** Space badge shape, matching the sidebar's treatment for the active
   *  layout variant. */
  badgeShape: "chiclet" | "circle";
  onPick: (id: string) => void;
}

interface ChatPanelProps {
  path: SelectionPath | undefined;
  mode: ViewMode;
  /** All spaces, for the composer's move-to-space dropdown. */
  workspaces: Workspace[];
  /** Badge shape for spaces in that dropdown (circle when the sidebar
   *  layout renders spaces as circles). */
  spaceBadgeShape: "chiclet" | "circle";
  /** "face" when the layout draws no agent/group distinction — every
   *  project's header badge wears the agent face (matches the sidebar). */
  projectBadge?: "kind" | "face";
  /** Unsent composer text per chat id (owned by App so parent timelines can
   *  render "1 Draft" pills). */
  drafts: Record<string, string>;
  onDraftChange: (targetId: string, text: string) => void;
  onSelect: (id: string, mode?: ViewMode) => void;
  /** Moves threads into a workspace, group, or thread. */
  onMove: (threadIds: string[], targetId: string) => void;
  onCreateChat: (
    workspaceId: string,
    mode?: ViewMode,
    parentMessageId?: string,
    excerpt?: string,
  ) => void;
  /** Container is a project or a thread (subthread). */
  onCreateThread: (
    containerId: string,
    mode?: ViewMode,
    parentMessageId?: string,
    excerpt?: string,
  ) => void;
  /** Appends a user message to the chat identified by targetId. */
  onSendMessage: (targetId: string, text: string) => void;
}

/**
 * Layout rules (workspaces, projects, and threads all act as thread
 * containers — threads nest recursively):
 * - Workspace/project selected: full-width parent chat; its threads appear
 *   as timeline entry points, ordered by time among the messages.
 * - Thread opened directly (sidebar): fullscreen thread chat.
 * - Thread opened from a parent timeline (from cursor-neue): split — parent
 *   left, thread right — when the panel is wide enough; otherwise the thread
 *   takes over the pane with a back chevron to the parent.
 */
export function ChatPanel({
  path,
  mode,
  workspaces,
  spaceBadgeShape,
  projectBadge = "kind",
  drafts,
  onDraftChange,
  onSelect,
  onMove,
  onCreateChat,
  onCreateThread,
  onSendMessage,
}: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setIsNarrow(entry.contentRect.width < SPLIT_MIN_WIDTH),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={panelRef} className="flex min-w-0 flex-1">
      <ChatPanelContent
        path={path}
        mode={mode}
        workspaces={workspaces}
        spaceBadgeShape={spaceBadgeShape}
        projectBadge={projectBadge}
        drafts={drafts}
        onDraftChange={onDraftChange}
        isNarrow={isNarrow}
        onSelect={onSelect}
        onMove={onMove}
        onCreateChat={onCreateChat}
        onCreateThread={onCreateThread}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}

function ChatPanelContent({
  path,
  mode,
  workspaces,
  spaceBadgeShape,
  projectBadge,
  drafts,
  onDraftChange,
  isNarrow,
  onSelect,
  onMove,
  onCreateChat,
  onCreateThread,
  onSendMessage,
}: ChatPanelProps & { isNarrow: boolean }) {
  if (!path) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-tertiary">Select a thread from the sidebar</p>
      </div>
    );
  }

  const { workspace, project } = path;
  const threadPath = path.threadPath ?? [];
  const thread = threadPath.length > 0 ? threadPath[threadPath.length - 1] : undefined;

  // Root parent chat: the project when inside one, otherwise the workspace's
  // main chat; its threads render as timeline entries either way.
  const root = project
    ? {
        id: project.id,
        title: project.name,
        subtitle: workspace.name,
        badgeIcon: project.icon,
        messages: project.messages,
        threads: project.threads,
        groupCreatedAt: project.createdAt,
      }
    : {
        id: workspace.id,
        title: workspace.name,
        subtitle: undefined,
        badgeIcon: undefined,
        messages: workspace.messages,
        threads: workspace.items.flatMap((i) => (i.kind === "thread" ? [i.thread] : [])),
        groupCreatedAt: undefined,
      };

  // The selected thread's parent chat: its parent thread when nested (threads
  // in threads), else the root chat. Drives the split view's left pane.
  const parentThread = threadPath.length > 1 ? threadPath[threadPath.length - 2] : undefined;
  const parent = parentThread
    ? {
        id: parentThread.id,
        title: parentThread.title,
        subtitle: threadPath.length > 2 ? threadPath[threadPath.length - 3].title : root.title,
        badgeIcon: undefined,
        messages: parentThread.messages,
        threads: parentThread.threads ?? [],
        groupCreatedAt: undefined,
      }
    : root;

  // Reply inside the selected thread spawns a subthread (one per base
  // message; replying on an already-threaded message opens the existing one).
  const replyInThread = (messageId?: string, excerpt?: string) => {
    if (!thread) return;
    const existing = messageId
      ? (thread.threads ?? []).find((t) => t.parentMessageId === messageId)
      : undefined;
    if (existing) onSelect(existing.id, "split");
    else onCreateThread(thread.id, "split", messageId, excerpt);
  };

  const threadTimeline = thread && (
    <Timeline
      messages={thread.messages}
      threads={thread.threads}
      drafts={drafts}
      onOpenThread={(id, mode) => onSelect(id, mode ?? "split")}
    />
  );

  // Only threads are movable; picking a space relocates the thread to its
  // top level (workspace/project main chats stay put).
  const spacePicker: SpacePicker | undefined = thread && {
    options: workspaces.map((w) => ({ id: w.id, name: w.name, icon: w.icon })),
    currentId: workspace.id,
    badgeShape: spaceBadgeShape,
    onPick: (id) => {
      if (id !== workspace.id) onMove([thread.id], id);
    },
  };

  if (thread && mode === "full") {
    return (
      <ChatView
        title={thread.title}
        subtitle={parent.title}
        className="flex-1"
        isNew={thread.messages.length === 0}
        context={parent.title}
        picker={spacePicker}
        quote={thread.excerpt}
        draft={drafts[thread.id] ?? ""}
        onDraftChange={(text) => onDraftChange(thread.id, text)}
        onReply={replyInThread}
        onSend={(text) => onSendMessage(thread.id, text)}
      >
        {threadTimeline}
      </ChatView>
    );
  }

  // Narrow takeover: no room for the split, so the thread replaces the parent
  // pane and a back chevron returns to it.
  if (thread && isNarrow) {
    return (
      <ChatView
        title={thread.title}
        subtitle={parent.title}
        className="flex-1"
        isNew={thread.messages.length === 0}
        context={parent.title}
        picker={spacePicker}
        quote={thread.excerpt}
        draft={drafts[thread.id] ?? ""}
        onDraftChange={(text) => onDraftChange(thread.id, text)}
        onBack={() => onSelect(parent.id)}
        onReply={replyInThread}
        onSend={(text) => onSendMessage(thread.id, text)}
      >
        {threadTimeline}
      </ChatView>
    );
  }

  return (
    <>
      <ChatView
        title={parent.title}
        subtitle={parent.subtitle}
        badge={
          !parentThread && project
            ? {
                icon: parent.badgeIcon,
                shape:
                  projectBadge === "face" || project.kind !== "group" ? "face" : "circle",
              }
            : undefined
        }
        className="min-w-0 flex-1"
        isNew={parent.messages.length === 0 && parent.threads.length === 0}
        // Big-entity empty states (a fresh space/project/agent main chat, not
        // Home, not threads) offer setup pills under the composer.
        setupActions={!parentThread && (!!project || workspace.id !== HOME_ID)}
        context={parent.subtitle ?? parent.title}
        draft={drafts[parent.id] ?? ""}
        onDraftChange={(text) => onDraftChange(parent.id, text)}
        onReply={(messageId, excerpt) => {
          // One thread per base message: replying on a message that already
          // has one opens the existing thread instead of stacking a second.
          const existing = messageId
            ? parent.threads.find((t) => t.parentMessageId === messageId)
            : undefined;
          if (existing) {
            onSelect(existing.id, "split");
          } else if (parentThread) {
            onCreateThread(parentThread.id, "split", messageId, excerpt);
          } else if (project) {
            onCreateThread(project.id, "split", messageId, excerpt);
          } else {
            onCreateChat(workspace.id, "split", messageId, excerpt);
          }
        }}
        onSend={(text) => onSendMessage(parent.id, text)}
      >
        <Timeline
          messages={parent.messages}
          threads={parent.threads}
          activeThreadId={thread?.id ?? null}
          groupCreatedAt={parent.groupCreatedAt}
          drafts={drafts}
          onOpenThread={(id, mode) => onSelect(id, mode ?? "split")}
        />
      </ChatView>
      {thread && (
        <ChatView
          title={thread.title}
          subtitle={parent.title}
          className="w-[42%] min-w-0 border-l border-tertiary"
          isNew={thread.messages.length === 0}
          context={parent.title}
          picker={spacePicker}
          quote={thread.excerpt}
          draft={drafts[thread.id] ?? ""}
          onDraftChange={(text) => onDraftChange(thread.id, text)}
          onClose={() => onSelect(parent.id)}
          onReply={replyInThread}
          onSend={(text) => onSendMessage(thread.id, text)}
        >
          {threadTimeline}
        </ChatView>
      )}
    </>
  );
}

function ChatView({
  title,
  subtitle,
  badge,
  className,
  isNew = false,
  context,
  setupActions = false,
  picker,
  quote,
  draft,
  onDraftChange,
  onBack,
  onClose,
  onReply,
  onSend,
  children,
}: {
  title: string;
  /** Muted name inline after the title (parent context). */
  subtitle?: string;
  /** Identity badge before the title (project/agent chats). */
  badge?: { icon?: IconName; shape?: "circle" | "face" };
  className?: string;
  /** Empty chat: centered expanded composer instead of a transcript
   *  (cursor-neue's new-agent state). */
  isNew?: boolean;
  /** Container name shown as the chip above the expanded composer. */
  context?: string;
  /** Big-entity new-chat state (fresh space/project/agent): setup pills under
   *  the expanded composer. */
  setupActions?: boolean;
  /** Makes the context chip a dropdown that moves the chat to a space. */
  picker?: SpacePicker;
  /** Highlighted text the thread replies to, quoted at the top of the
   *  transcript like a referenced message. */
  quote?: string;
  /** Unsent composer text for this chat, owned by App (drives draft pills). */
  draft: string;
  onDraftChange: (text: string) => void;
  /** Narrow takeover: chevron back to the parent chat. */
  onBack?: () => void;
  onClose?: () => void;
  /** Spawns a thread off this conversation (cursor-neue's "Reply in Thread"),
   *  anchored to the message containing the selection when there is one; the
   *  highlighted text is passed along to quote in the new thread. */
  onReply?: (messageId?: string, excerpt?: string) => void;
  onSend?: (text: string) => void;
  children?: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  // Floating pill anchor, in the transcript column's coordinate space (so it
  // scrolls with the content). Null while nothing is selected.
  const [replyAnchor, setReplyAnchor] = useState<{
    x: number;
    y: number;
    messageId?: string;
    excerpt?: string;
  } | null>(null);

  useEffect(() => {
    if (!onReply) return;
    const handle = () => {
      const sel = document.getSelection();
      const content = contentRef.current;
      if (
        !sel ||
        sel.isCollapsed ||
        !content ||
        !content.contains(sel.anchorNode) ||
        !content.contains(sel.focusNode)
      ) {
        setReplyAnchor(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      // The message the selection lives in becomes the thread's base message.
      const container = range.commonAncestorContainer;
      const el = container instanceof Element ? container : container.parentElement;
      const messageId = el?.closest("[data-message-id]")?.getAttribute("data-message-id");
      const excerpt = sel.toString().trim();
      setReplyAnchor({
        x: rect.left + rect.width / 2 - contentRect.left,
        y: rect.top - contentRect.top,
        messageId: messageId ?? undefined,
        excerpt: excerpt || undefined,
      });
    };
    document.addEventListener("selectionchange", handle);
    return () => document.removeEventListener("selectionchange", handle);
  }, [onReply]);

  return (
    <section className={clsx("flex min-h-0 flex-col", className)}>
      <header className="flex h-toolbar shrink-0 items-center gap-1.5 px-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to parent chat"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-tertiary transition-colors duration-fast hover:bg-quaternary hover:text-primary"
          >
            <Icon name="chevron-left" size="sm" color="inherit" />
          </button>
        )}
        {badge && <LeadingBadge shape={badge.shape ?? "circle"} icon={badge.icon} label={title} />}
        <h1 className="flex min-w-0 items-baseline gap-1.5 text-base font-medium text-primary">
          <span className="truncate">{title}</span>
          {subtitle && <span className="truncate font-normal text-quaternary">{subtitle}</span>}
        </h1>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close thread"
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-tertiary transition-colors duration-fast hover:bg-quaternary hover:text-primary"
          >
            <Icon name="x" size="sm" color="inherit" />
          </button>
        )}
      </header>

      {isNew && !quote ? (
        // New-chat state (from cursor-neue): centered expanded composer.
        // px-3 here stacks with the composer's own px-3 to match neue's
        // 24px pane gutter.
        <div className="flex flex-1 items-center justify-center overflow-auto px-3">
          <ExpandedComposer
            context={context}
            picker={picker}
            setupActions={setupActions}
            value={draft}
            onChange={onDraftChange}
            onSend={onSend}
          />
        </div>
      ) : (
        <>
      <div className="scrollbar-overlay flex-1 overflow-auto pb-4 pt-2">
        <div ref={contentRef} className={clsx(COLUMN, "relative flex flex-col gap-3")}>
          {quote && (
            // The excerpt this thread replies to, pinned at the top of the
            // transcript like a quoted message.
            <div className="px-2.5">
              <div className="border-l-2 border-secondary pl-2 text-base italic text-tertiary">
                {quote}
              </div>
            </div>
          )}
          {children}
          {onReply && replyAnchor && (
            // Selection-anchored reply pill (cursor-neue): floats above the
            // highlighted text; mousedown is swallowed so the click doesn't
            // collapse the selection before it lands.
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                document.getSelection()?.removeAllRanges();
                setReplyAnchor(null);
                onReply(replyAnchor.messageId, replyAnchor.excerpt);
              }}
              style={{ left: replyAnchor.x, top: replyAnchor.y - 6 }}
              className="absolute z-10 -translate-x-1/2 -translate-y-full select-none whitespace-nowrap rounded-lg bg-elevated px-2.5 py-1 text-base text-primary shadow-[var(--cursor-box-shadow-sm)] transition-colors duration-fast hover:bg-quaternary-opaque"
            >
              Reply in Thread
            </button>
          )}
        </div>
      </div>

      <Composer
        placeholder={quote ? "Reply in thread..." : "/ for commands, @ to add context..."}
        value={draft}
        onChange={onDraftChange}
        onSend={onSend}
      />
        </>
      )}
    </section>
  );
}

type TimelineEntry =
  | { kind: "message"; at: string; message: Message }
  /** A thread reply that landed after the main conversation had moved past its
   *  base message — a "New replies in..." line at its own time. */
  | { kind: "reply-event"; at: string; thread: Thread }
  /** A thread created independently of any base message (e.g. via the sidebar
   *  plus) — a "created a thread..." line at its creation time. */
  | { kind: "created-event"; at: string; thread: Thread }
  /** Threads swept into a group at its creation, collapsed into a single
   *  "Created group..." line instead of one event per thread. */
  | { kind: "group-created"; at: string };

/** Time-ordered transcript with dividers whenever the conversation goes quiet
 *  for over an hour. Threads anchored to a base message (parentMessageId)
 *  hang under it: user-started threads as reply pills, agent-created ones as
 *  cards. Unanchored threads and out-of-turn thread replies surface as
 *  timestamp-styled event lines in time order. */
function Timeline({
  messages,
  threads = [],
  activeThreadId = null,
  groupCreatedAt,
  drafts,
  onOpenThread,
}: {
  messages: Message[];
  threads?: Thread[];
  activeThreadId?: string | null;
  /** When set (project created by grouping), threads that predate it collapse
   *  into a single "Created group" event instead of per-thread events. */
  groupCreatedAt?: string;
  /** Unsent composer text per chat id, for "1 Draft" pills. */
  drafts?: Record<string, string>;
  /** Event lines pass "full" to jump straight to the thread; pills and cards
   *  omit the mode and open split. */
  onOpenThread?: (id: string, mode?: ViewMode) => void;
}) {
  const hasDraft = (t: Thread) => !!drafts?.[t.id]?.trim();
  const sorted = [...messages].sort((a, b) => a.at.localeCompare(b.at));

  const threadsByMessage = new Map<string, Thread[]>();
  const events: TimelineEntry[] = [];
  let hasGroupedThreads = false;
  for (const t of threads) {
    const anchor = t.parentMessageId
      ? sorted.find((m) => m.id === t.parentMessageId)
      : undefined;
    if (anchor) {
      threadsByMessage.set(anchor.id, [...(threadsByMessage.get(anchor.id) ?? []), t]);
    } else if (groupCreatedAt && t.createdAt <= groupCreatedAt) {
      hasGroupedThreads = true;
    } else {
      events.push({ kind: "created-event", at: t.createdAt, thread: t });
    }

    // Out-of-turn detection: the thread's latest agent reply came after the
    // main chat had already continued past the thread's origin point.
    const originAt = anchor?.at ?? t.createdAt;
    const last = t.messages[t.messages.length - 1];
    const nextMain = sorted.find((m) => m.at > originAt);
    if (last?.role === "agent" && nextMain && last.at > nextMain.at) {
      events.push({ kind: "reply-event", at: last.at, thread: t });
    }
  }
  if (hasGroupedThreads && groupCreatedAt) {
    events.push({ kind: "group-created", at: groupCreatedAt });
  }

  // Fully empty chats never reach here — ChatView renders the expanded
  // composer (new-chat state) instead.
  if (sorted.length === 0 && events.length === 0) return null;

  const entries: TimelineEntry[] = [
    ...sorted.map((m) => ({ kind: "message" as const, at: m.at, message: m })),
    ...events,
  ].sort((a, b) => a.at.localeCompare(b.at));

  const threadAccess = (list: Thread[]) => {
    // Empty user threads stay invisible until something is typed in their
    // composer; a non-empty draft surfaces as a "1 Draft" pill.
    const visible = list.filter(
      (t) => t.createdBy === "agent" || t.messages.length > 0 || hasDraft(t),
    );
    if (visible.length === 0) return null;
    return (
      <div className="flex w-full flex-col items-start gap-1.5 px-1">
        {visible.map((t) =>
          t.createdBy === "agent" ? (
            <ThreadCard
              key={t.id}
              thread={t}
              active={t.id === activeThreadId}
              onOpen={() => onOpenThread?.(t.id)}
            />
          ) : (
            <ReplyPill
              key={t.id}
              thread={t}
              active={t.id === activeThreadId}
              onOpen={() => onOpenThread?.(t.id)}
            />
          ),
        )}
      </div>
    );
  };

  return (
    <>
      {entries.map((entry, i) => {
        const prev = entries[i - 1];
        // Event lines carry their own timestamp, so dividers only precede
        // messages.
        const showDivider =
          entry.kind === "message" &&
          (!prev || new Date(entry.at).getTime() - new Date(prev.at).getTime() > 60 * 60 * 1000);
        // Extra air when the speaker flips (user ↔ agent); the divider already
        // separates entries when it renders.
        const roleChanged =
          !showDivider &&
          prev?.kind === "message" &&
          entry.kind === "message" &&
          prev.message.role !== entry.message.role;

        if (entry.kind === "group-created") {
          return <EventLine key="group-created" label="Created group" at={entry.at} />;
        }

        if (entry.kind !== "message") {
          const label =
            entry.kind === "reply-event"
              ? `New replies in ${entry.thread.title}`
              : `${entry.thread.createdBy === "agent" ? "Agent" : "You"} created a thread ${entry.thread.title}`;
          return (
            <EventLine
              key={`${entry.kind}-${entry.thread.id}`}
              label={label}
              at={entry.at}
              onOpen={() => onOpenThread?.(entry.thread.id, "full")}
            />
          );
        }

        const message = entry.message;
        const messageThreads = threadsByMessage.get(message.id);
        return (
          <Fragment key={message.id}>
            {showDivider && <TimeDivider at={entry.at} />}
            <div
              data-message-id={message.id}
              className={clsx(
                "flex flex-col gap-1",
                message.role === "user" && "items-end",
                roleChanged && "mt-4",
              )}
            >
              <MessageTurn message={message} />
              {messageThreads && threadAccess(messageThreads)}
            </div>
          </Fragment>
        );
      })}
    </>
  );
}

/** Out-of-turn thread activity in the timestamp style of the time dividers:
 *  "{what happened} · {when}", clickable to open the thread. */
function EventLine({
  label,
  at,
  onOpen,
}: {
  label: string;
  at: string;
  onOpen?: () => void;
}) {
  const text = `${label} · ${dividerLabel(at)}`;
  return (
    <div className="flex justify-center py-2">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="max-w-full truncate text-sm text-quaternary transition-colors duration-fast hover:text-secondary"
        >
          {text}
        </button>
      ) : (
        <span className="max-w-full truncate text-sm text-quaternary">{text}</span>
      )}
    </div>
  );
}

/** Card-style thread access for agent-created workstreams under their base
 *  message: title, plus a muted reply count once the human has engaged. */
function ThreadCard({
  thread,
  active,
  onOpen,
}: {
  thread: Thread;
  active: boolean;
  onOpen: () => void;
}) {
  // Reply count only once the human has engaged; pure agent self-activity
  // stays a clean title-only card.
  const replies = thread.messages.length;
  const humanEngaged = thread.messages.some((m) => m.role === "user");
  const countLabel = `${replies} ${replies === 1 ? "reply" : "replies"}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        "flex w-full flex-col items-start gap-0.5 rounded-xl bg-elevated px-3 py-2 text-left transition-colors duration-fast hover:bg-quaternary-opaque",
        active
          ? "shadow-[0_0_0_1px_var(--border-accent-secondary)]"
          : "shadow-[0_0_0_1px_var(--border-tertiary)]",
      )}
    >
      <span className="text-base font-medium text-primary">
        {thread.title}
        {humanEngaged && <span className="font-normal text-tertiary"> · {countLabel}</span>}
      </span>
    </button>
  );
}

/** A thread's access point, hanging off its base message like a Slack reply
 *  count. Clicking opens the thread split beside this chat. */
function ReplyPill({
  thread,
  active,
  onOpen,
}: {
  thread: Thread;
  active: boolean;
  onOpen: () => void;
}) {
  const replies = thread.messages.length;
  // Empty threads only render at all when a draft exists (see threadAccess).
  const label = replies === 0 ? "1 Draft" : `${replies} ${replies === 1 ? "Reply" : "Replies"}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      title={thread.title}
      className={clsx(
        "flex w-fit select-none items-center rounded-lg px-1.5 py-1 text-base transition-colors duration-fast",
        active ? "bg-quaternary" : "hover:bg-quaternary",
      )}
      style={{ color: "var(--text-accent)" }}
    >
      {label}
    </button>
  );
}

function MessageTurn({ message }: { message: Message }) {
  if (message.role === "user") {
    // User turn: quaternary bubble with a 0.5px ring (ring, not border, so
    // the hairline doesn't push text inward).
    return (
      <div className="w-fit max-w-[85%] rounded-2xl bg-quaternary px-2.5 py-2 text-lg text-primary shadow-[0_0_0_0.5px_var(--border-quaternary)]">
        {message.text}
      </div>
    );
  }
  // Agent turn: "Thought Ns" header + plain text on the chrome.
  return (
    <div className="flex w-full flex-col gap-1 px-2.5">
      {message.thoughtSecs != null && (
        <span className="text-base text-tertiary">Thought {message.thoughtSecs}s</span>
      )}
      <p className="text-lg text-primary">{message.text}</p>
    </div>
  );
}

function TimeDivider({ at }: { at: string }) {
  return (
    <div className="flex justify-center py-4">
      <span className="text-sm text-quaternary">{dividerLabel(at)}</span>
    </div>
  );
}

/** "9:41 AM" today, "Yesterday 4:12 PM", weekday within a week, else date. */
function dividerLabel(at: string): string {
  const d = new Date(at);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return time;
  if (days === 1) return `Yesterday ${time}`;
  if (days < 7) return `${d.toLocaleDateString([], { weekday: "long" })} ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

/** Round add-context button, shared by the pill and expanded composers. */
function AddContextButton() {
  return (
    <button
      type="button"
      aria-label="Add context"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tertiary transition-colors duration-fast hover:bg-quaternary"
    >
      <Icon name="plus" size="base" color="secondary" />
    </button>
  );
}

/** Round dictate button, shared by the pill and expanded composers. */
function DictateButton() {
  return (
    <button
      type="button"
      aria-label="Dictate"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral transition-colors duration-fast hover:bg-neutral-hover"
    >
      <Icon name="mic-filled" size="base" color="inherit" style={{ color: "var(--text-inverted)" }} />
    </button>
  );
}

/** Single-line pill composer (from cursor-neue's followup Composer): elevated,
 *  1px secondary ring, fully rounded, add-context left and dictate right.
 *  Enter sends when the pane provides onSend. Controlled by the App-owned
 *  draft so unsent text survives pane swaps and drives draft pills. */
function Composer({
  placeholder,
  value,
  onChange,
  onSend,
}: {
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  onSend?: (text: string) => void;
}) {
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || !onSend) return;
    onSend(trimmed);
  };

  return (
    <form onSubmit={submit} className={clsx(COLUMN, "pb-3")}>
      <div className="flex items-center gap-2 rounded-full bg-elevated p-2 shadow-[0_0_0_1px_var(--border-secondary)]">
        <AddContextButton />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-lg text-primary outline-none placeholder:text-quaternary"
        />
        <DictateButton />
      </div>
    </form>
  );
}

/** The container chip above the expanded composer. With a picker it opens a
 *  space dropdown; picking a space moves the chat there. */
function ContextChip({ label, picker }: { label: string; picker?: SpacePicker }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative flex min-w-0 items-center px-2.5">
      <button
        type="button"
        onClick={picker && (() => setOpen((o) => !o))}
        className="flex min-w-0 items-center gap-1 text-base text-secondary"
      >
        <span className="truncate text-left">{label}</span>
        <Icon name="chevron-down" size="sm" color="quaternary" />
      </button>
      {picker && open && (
        <div className="absolute left-2.5 top-full z-20 mt-1 flex min-w-[180px] flex-col rounded-lg bg-elevated p-1 shadow-[0_0_0_1px_var(--border-tertiary),0_4px_12px_rgba(0,0,0,0.15)]">
          {picker.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setOpen(false);
                picker.onPick(o.id);
              }}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm text-primary transition-colors duration-fast hover:bg-quaternary"
            >
              <LeadingBadge shape={picker.badgeShape} icon={o.icon} label={o.name} />
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              {o.id === picker.currentId && <Icon name="check" size="sm" color="secondary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EXPANDED_INPUT_MIN_H = 60; // 3 lines of 20px (cursor-neue's resting card height)
const EXPANDED_INPUT_MAX_H = 200; // 10 lines, then the textarea scrolls

/** Two-story composer card for empty chats (cursor-neue's expanded variant):
 *  auto-growing textarea over an action bar (add-context, model chip,
 *  dictate), with a container chip row above. */
function ExpandedComposer({
  context,
  picker,
  setupActions = false,
  value,
  onChange,
  onSend,
}: {
  context?: string;
  picker?: SpacePicker;
  /** Setup pills (Add Files / Add Plugins) under the card, for freshly
   *  created big entities (space/project/agent). */
  setupActions?: boolean;
  value: string;
  onChange: (text: string) => void;
  onSend?: (text: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Value is controlled from above, so resize after each render it changes.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, EXPANDED_INPUT_MAX_H)}px`;
  }, [value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || !onSend) return;
    onSend(trimmed);
  };

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-2 px-3">
      {context && <ContextChip label={context} picker={picker} />}
      <div className="flex flex-col rounded-2xl bg-elevated shadow-[0_0_0_1px_var(--border-secondary)]">
        <div className="px-2.5 pt-2.5">
          <textarea
            ref={inputRef}
            rows={1}
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Plan, @ for context, / for commands"
            style={{ minHeight: EXPANDED_INPUT_MIN_H, maxHeight: EXPANDED_INPUT_MAX_H }}
            className="w-full min-w-0 resize-none overflow-y-auto bg-transparent text-lg leading-[20px] text-primary outline-none placeholder:text-quaternary"
          />
        </div>
        <div className="flex items-center justify-between gap-2 p-2">
          <div className="flex min-w-0 items-center gap-2">
            <AddContextButton />
            <button type="button" className="flex min-w-0 items-center gap-1 text-base text-secondary">
              <span className="truncate text-left">Composer 2.5</span>
              <Icon name="chevron-down" size="sm" color="quaternary" />
            </button>
          </div>
          <DictateButton />
        </div>
      </div>
      {setupActions && (
        <div className="flex gap-2 pt-1">
          <SetupPill icon="file-plus" label="Add Files" />
          <SetupPill icon="folder-plus" label="Add Folder" />
          <SetupPill icon="extensions" label="Add Plugins" />
        </div>
      )}
    </div>
  );
}

/** Pill-shaped setup action under the expanded composer (demo-only, inert). */
function SetupPill({ icon, label }: { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      className="flex h-7 items-center gap-1.5 rounded-full px-3 text-base text-secondary shadow-[0_0_0_1px_var(--border-secondary)] transition-colors duration-fast hover:bg-quaternary hover:text-primary"
    >
      <Icon name={icon} size="sm" color="secondary" />
      {label}
    </button>
  );
}