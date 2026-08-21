import { useEffect, useLayoutEffect, useState } from "react";
import clsx from "clsx";
import { AnalogyChart } from "./components/AnalogyChart";
import { ChatPanel } from "./components/ChatPanel";
import { MobileShell, type IndexStyle } from "./components/MobileShell";
import { AGENT_NOUN_VARIANTS, Sidebar, type HomeVariant, type SortMode } from "./components/Sidebar";
import { Icon } from "./components/ui/Icon";
import { SegmentedControl } from "./components/ui/SegmentedControl";
import { SettingsSection } from "./components/ui/SettingsSection";
import { flattenThreads, initialWorkspaces, resolvePath } from "./data";
import { captureElement } from "./lib/screenshot";
import type { IconName } from "./icons/iconNames";
import type { Message, Project, Thread, ViewMode, Workspace, WorkspaceItem } from "./types";
import { version } from "../package.json";

/** Pool for freshly created groups' circle badges. */
const GROUP_ICONS: IconName[] = [
  "sparkles",
  "folder",
  "palette",
  "globe",
  "shield",
  "briefcase",
  "chart-bars",
  "tray",
];

const newThread = (title: string, parentMessageId?: string, excerpt?: string): Thread => ({
  id: crypto.randomUUID(),
  title,
  createdAt: new Date().toISOString(),
  parentMessageId,
  excerpt,
  messages: [],
});

interface Selection {
  id: string;
  /** Threads open fullscreen when picked directly (sidebar), split when
   *  opened from a parent chat's timeline. */
  mode: ViewMode;
}

const HOME_ID = "ws-home";

/** Cross-axis to the layout variants: how many items the seed hierarchy
 *  holds, from an empty first run to the full accumulated mess. Switching
 *  resets any runtime edits to the chosen seed. */
type DataState = "start" | "simple" | "complex";

/** Desktop renders sidebar + chat side by side; mobile renders the same
 *  construction in a phone frame where nesting becomes push navigation. */
type Device = "desktop" | "mobile";

/** Top-level view tabs: "all" is the full comparison (every approach plus
 *  the taxonomy chart); "selects" narrows to the shortlisted finalists and
 *  drops the chart to focus on the sidebar itself. */
type FocusMode = "all" | "selects";

/** The shortlisted finalists shown in the Selects tab. */
const SELECT_VARIANTS: HomeVariant[] = ["sections", "flat"];

/** What the focused (chromeless) window locks its shape to: fluid
 *  fit-to-viewport, or a fixed recording ratio. */
type FocusRatio = "fill" | "16:9" | "16:10" | "4:3" | "1:1";

const FOCUS_RATIO_OPTIONS: { value: FocusRatio; label: string }[] = [
  { value: "fill", label: "Fill" },
  { value: "16:9", label: "16:9" },
  { value: "16:10", label: "16:10" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
];

/** Largest ratio-locked rect fitting the viewport inside the page's p-8
 *  padding (the window is the only content in chromeless mode, so the
 *  available box is just the viewport minus 2 × 32px). */
const focusRatioStyle = (ratio: FocusRatio): React.CSSProperties | undefined => {
  if (ratio === "fill") return undefined;
  const [w, h] = ratio.split(":").map(Number);
  return {
    aspectRatio: `${w} / ${h}`,
    width: `min(100vw - 64px, calc((100vh - 64px) * ${w / h}))`,
  };
};

/** Keeps a workspace's first few chats and projects (projects trimmed to a
 *  couple of threads each) for the light "simple" seed. */
const trimWorkspace = (w: Workspace, chats: number, projects: number): Workspace => ({
  ...w,
  items: [
    ...w.items.filter((i) => i.kind === "thread").slice(0, chats),
    ...w.items
      .filter((i) => i.kind === "project")
      .slice(0, projects)
      .map((i) =>
        i.kind === "project"
          ? { ...i, project: { ...i.project, threads: i.project.threads.slice(0, 2) } }
          : i,
      ),
  ],
});

const seedForState = (state: DataState): Workspace[] => {
  const home = initialWorkspaces.find((w) => w.id === HOME_ID)!;
  switch (state) {
    case "start":
      // First-time usage: an empty Home, nothing else.
      return [{ ...home, messages: [], items: [] }];
    case "simple": {
      // A handful of items: a couple of Home chats plus its agent, and one
      // space holding a couple of chats and one group.
      const spaces = initialWorkspaces.filter((w) => w.id !== HOME_ID);
      return [trimWorkspace(home, 2, 1), ...spaces.slice(0, 1).map((w) => trimWorkspace(w, 2, 1))];
    }
    case "complex":
      return initialWorkspaces;
  }
};

export default function App() {
  // Native scrollbar width (0 with macOS overlay scrollbars, ~8px classic),
  // published as --scrollbar-w for the pr-gutter-* compensated paddings.
  useLayoutEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;";
    document.body.appendChild(probe);
    const w = probe.offsetWidth - probe.clientWidth;
    document.documentElement.style.setProperty("--scrollbar-w", `${w}px`);
    probe.remove();
  }, []);

  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [homeVariant, setHomeVariant] = useState<HomeVariant>("distinct");
  const [focusMode, setFocusMode] = useState<FocusMode>("all");
  const changeFocusMode = (mode: FocusMode) => {
    setFocusMode(mode);
    // Selects only offers the finalists; snap to one if needed.
    if (mode === "selects" && !SELECT_VARIANTS.includes(homeVariant)) {
      setHomeVariant(SELECT_VARIANTS[0]);
    }
  };
  // Chromeless view for clean recordings: only the mock window renders (no
  // tabs, settings panel, or chart). Esc or the hover corner button exits.
  const [chromeless, setChromeless] = useState(false);
  const [focusRatio, setFocusRatio] = useState<FocusRatio>("fill");
  /** Downloads the focused viewport as a PNG (2x). The corner controls are
   *  stripped from the clone so the shot is exactly the recording frame. */
  const exportShot = () => {
    const node = document.querySelector<HTMLElement>("[data-capture-root]");
    if (!node) return;
    const ratio = focusRatio === "fill" ? "" : `-${focusRatio.replace(":", "x")}`;
    void captureElement(node, {
      filename: `hierarchy-${homeVariant}${ratio}.png`,
      // The page bg lives on <body>, outside the captured node.
      background: getComputedStyle(document.body).backgroundColor,
      prepare: (clone) => clone.querySelector("[data-export-hide]")?.remove(),
    });
  };
  useEffect(() => {
    if (!chromeless) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChromeless(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chromeless]);
  // Desktop-only: hierarchy sections vs one flat recency-bucketed chat list.
  const [sortMode, setSortMode] = useState<SortMode>("entities");
  const [device, setDevice] = useState<Device>("desktop");
  // Mobile-only: how a top-level container exposes its child index (nav-bar
  // sheet vs footer chat/index swap).
  const [indexStyle, setIndexStyle] = useState<IndexStyle>("sheet");
  const [dataState, setDataState] = useState<DataState>("complex");
  const [selection, setSelection] = useState<Selection | null>({ id: "ws-acme", mode: "full" });
  // Reply-spawned threads aren't real entities yet: they live here until the
  // first draft keystroke or message — the same signal that surfaces their
  // parent-timeline pill ("1 Draft"/"N Replies"). Abandoning one (navigating
  // away still empty) discards it without ever touching the hierarchy.
  const [pendingReply, setPendingReply] = useState<{
    thread: Thread;
    containerId: string;
    /** "chat" inserts at the workspace's top level, "thread" into a
     *  project or parent thread. */
    kind: "chat" | "thread";
  } | null>(null);
  // The pristine seed currently loaded; `workspaces` drifting from this ref
  // (any runtime edit) is what enables the settings panel's Reset button.
  const [seedRef, setSeedRef] = useState<Workspace[]>(initialWorkspaces);
  const changeDataState = (state: DataState) => {
    const seed = seedForState(state);
    setDataState(state);
    setSeedRef(seed);
    setWorkspaces(seed);
    setPendingReply(null);
    setDrafts({});
    // The old selection may not exist in the new seed; land somewhere safe.
    setSelection({ id: state === "start" ? HOME_ID : "ws-acme", mode: "full" });
  };
  /** Discards every runtime edit and reloads the active seed. */
  const resetToSeed = () => {
    setWorkspaces(seedRef);
    setPendingReply(null);
    setDrafts({});
    setRenameRequestId(null);
    setSelection({ id: dataState === "start" ? HOME_ID : "ws-acme", mode: "full" });
  };
  // Freshly created container (group/agent/space) whose sidebar row should
  // open in inline-rename with its placeholder name selected.
  const [renameRequestId, setRenameRequestId] = useState<string | null>(null);
  // Unsent composer text per chat id; an empty thread with a draft surfaces
  // as a "1 Draft" pill in its parent timeline.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const setDraft = (targetId: string, text: string) => {
    setDrafts((d) => ({ ...d, [targetId]: text }));
    if (pendingReply && targetId === pendingReply.thread.id && text.trim()) {
      materializePendingReply();
    }
  };

  /** Default project names re-noun to the active layout at render time, so a
   *  container created as "Untitled group" reads "Untitled Agent" in layouts
   *  where every container is an agent (and vice versa). Real names pass
   *  through untouched. */
  const displayProjectName = (project: Project): string => {
    const nouns = AGENT_NOUN_VARIANTS.includes(homeVariant)
      ? { untitled: "Untitled Agent", created: "New Agent" }
      : homeVariant === "all-projects" || homeVariant === "projects-separate"
        ? { untitled: "Untitled project", created: "New project" }
        : project.kind === "group"
          ? { untitled: "Untitled group", created: "New group" }
          : { untitled: "Untitled Agent", created: "New Agent" };
    if (/^untitled (group|agent|project)$/i.test(project.name)) return nouns.untitled;
    if (/^new (group|agent|project)$/i.test(project.name)) return nouns.created;
    return project.name;
  };
  const displayWorkspaces = workspaces.map((w) => ({
    ...w,
    items: w.items.map((i) =>
      i.kind === "project"
        ? { ...i, project: { ...i.project, name: displayProjectName(i.project) } }
        : i,
    ),
  }));
  // A pending reply thread isn't in the hierarchy yet, so synthesize its path
  // from its container's to render the split view.
  let path = selection ? resolvePath(displayWorkspaces, selection.id) : undefined;
  if (!path && pendingReply && selection?.id === pendingReply.thread.id) {
    const base = resolvePath(displayWorkspaces, pendingReply.containerId);
    if (base) {
      path = { ...base, threadPath: [...(base.threadPath ?? []), pendingReply.thread] };
    }
  }

  const select = (id: string, mode: ViewMode = "full") => {
    setSelection({ id, mode });
    // Navigating away abandons a still-empty pending reply thread.
    setPendingReply((p) => (p && p.thread.id !== id ? null : p));
  };

  /** Inserts a top-level chat at the top of the workspace's list. */
  const insertChat = (workspaceId: string, thread: Thread) =>
    setWorkspaces((all) =>
      all.map((w) =>
        w.id === workspaceId ? { ...w, items: [{ kind: "thread", thread }, ...w.items] } : w,
      ),
    );

  /** Inserts a thread into a container — a project or another thread. */
  const insertThread = (containerId: string, thread: Thread) => {
    const insert = (t: Thread): Thread =>
      t.id === containerId
        ? { ...t, threads: [thread, ...(t.threads ?? [])] }
        : { ...t, threads: t.threads?.map(insert) };
    setWorkspaces((all) =>
      all.map((w) => ({
        ...w,
        items: w.items.map((i) => {
          if (i.kind === "thread") return { ...i, thread: insert(i.thread) };
          if (i.project.id === containerId) {
            return { ...i, project: { ...i.project, threads: [thread, ...i.project.threads] } };
          }
          return { ...i, project: { ...i.project, threads: i.project.threads.map(insert) } };
        }),
      })),
    );
  };

  /** Promotes the pending reply thread into a real entity (first draft
   *  keystroke or first message — when its pill would start rendering). */
  const materializePendingReply = () => {
    if (!pendingReply) return;
    const { thread, containerId, kind } = pendingReply;
    setPendingReply(null);
    if (kind === "chat") insertChat(containerId, thread);
    else insertThread(containerId, thread);
  };

  /** New top-level chat. Reply-spawned ones (mode "split") stay pending
   *  until typed in; deliberate sidebar creations insert immediately. */
  const createChat = (
    workspaceId: string,
    mode: ViewMode = "full",
    parentMessageId?: string,
    excerpt?: string,
  ) => {
    const thread = newThread("New Chat", parentMessageId, excerpt);
    if (mode === "split") setPendingReply({ thread, containerId: workspaceId, kind: "chat" });
    else insertChat(workspaceId, thread);
    select(thread.id, mode);
  };

  /** New thread under a container — a project or another thread (subthread).
   *  Reply-spawned ones (mode "split") stay pending until typed in. */
  const createThread = (
    containerId: string,
    mode: ViewMode = "full",
    parentMessageId?: string,
    excerpt?: string,
  ) => {
    const thread = newThread("New Thread", parentMessageId, excerpt);
    if (mode === "split") setPendingReply({ thread, containerId, kind: "thread" });
    else insertThread(containerId, thread);
    select(thread.id, mode);
  };

  /** New empty agent group (project), appended to the workspace's list.
   *  Development Proposal and Projects, Threads list only group-kind
   *  projects, so create a group there (an agent would never surface). */
  const createProject = (workspaceId: string) => {
    const project: Project = {
      id: crypto.randomUUID(),
      name: "New Agent",
      kind:
        homeVariant === "projects-separate" || homeVariant === "all-projects"
          ? "group"
          : "agent",
      createdAt: new Date().toISOString(),
      icon: GROUP_ICONS[Math.floor(Math.random() * GROUP_ICONS.length)],
      messages: [],
      threads: [],
    };
    setWorkspaces((all) =>
      all.map((w) =>
        w.id === workspaceId ? { ...w, items: [...w.items, { kind: "project", project }] } : w,
      ),
    );
    select(project.id);
    setRenameRequestId(project.id);
  };

  /** New empty space (workspace), appended after the existing ones. */
  const createSpace = () => {
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: "New Space",
      messages: [],
      items: [],
    };
    setWorkspaces((all) => [...all, workspace]);
    select(workspace.id);
    setRenameRequestId(workspace.id);
  };

  /** Moves the given threads (from anywhere in the hierarchy) into a new
   *  "Untitled group" project, anchored at the first-selected thread: the
   *  group lands in that thread's workspace, at its top-level slot. */
  const groupThreads = (threadIds: string[]) => {
    const ids = new Set(threadIds);
    const found = new Map<string, Thread>();
    for (const w of workspaces) {
      // Matched threads keep their subtree; a matched descendant of another
      // match moves along with its parent instead of duplicating as a sibling.
      const collect = (threads: Thread[]) => {
        for (const t of threads) {
          if (ids.has(t.id)) {
            found.set(t.id, t);
          } else {
            collect(t.threads ?? []);
          }
        }
      };
      for (const item of w.items) {
        collect(item.kind === "thread" ? [item.thread] : item.project.threads);
      }
    }
    const anchorId = threadIds[0];
    const containsAnchor = (i: WorkspaceItem) =>
      flattenThreads(i.kind === "thread" ? [i.thread] : i.project.threads).some(
        (t) => t.id === anchorId,
      );
    const hostWorkspaceId = workspaces.find((w) => w.items.some(containsAnchor))?.id;
    if (!hostWorkspaceId || found.size < 2) return;

    const project: Project = {
      id: crypto.randomUUID(),
      // Match each layout's nomenclature: agent-noun layouts call every
      // container an agent; All Projects calls them projects.
      name: AGENT_NOUN_VARIANTS.includes(homeVariant)
        ? "Untitled Agent"
        : homeVariant === "all-projects"
          ? "Untitled project"
          : "Untitled group",
      kind: "group",
      createdAt: new Date().toISOString(),
      icon: GROUP_ICONS[Math.floor(Math.random() * GROUP_ICONS.length)],
      messages: [],
      threads: threadIds
        .flatMap((id) => (found.has(id) ? [found.get(id)!] : []))
        // Anchors point at messages in the old parent chat; drop them.
        .map((t) => ({ ...t, parentMessageId: undefined })),
    };

    const prune = (threads: Thread[]): Thread[] =>
      threads
        .filter((t) => !ids.has(t.id))
        .map((t) => (t.threads ? { ...t, threads: prune(t.threads) } : t));
    const pruneItem = (i: WorkspaceItem): WorkspaceItem | null =>
      i.kind === "thread"
        ? ids.has(i.thread.id)
          ? null
          : { ...i, thread: { ...i.thread, threads: prune(i.thread.threads ?? []) } }
        : { ...i, project: { ...i.project, threads: prune(i.project.threads) } };
    setWorkspaces((all) =>
      all.map((w) => {
        if (w.id !== hostWorkspaceId) {
          return { ...w, items: w.items.flatMap((i) => pruneItem(i) ?? []) };
        }
        // The group takes the anchor's slot, sliding in where the top-level
        // item holding the first-selected thread sits (instead of appending).
        const items: WorkspaceItem[] = [];
        for (const i of w.items) {
          if (containsAnchor(i)) items.push({ kind: "project", project });
          const kept = pruneItem(i);
          if (kept) items.push(kept);
        }
        return { ...w, items };
      }),
    );
    // Read-only groups aren't chat-able, so there's no group chat to land
    // in — keep the first grouped thread focused instead.
    const readonlyGroups =
      homeVariant === "space-agent-readonly" || homeVariant === "projects-readonly";
    select(readonlyGroups ? anchorId : project.id);
    setRenameRequestId(project.id);
  };

  /** Moves threads (with their subtrees) into a target container: a workspace
   *  (top level), a group, or another thread (as subthreads). */
  const moveThreads = (threadIds: string[], targetId: string) => {
    const ids = new Set(threadIds);
    const found = new Map<string, Thread>();
    for (const w of workspaces) {
      // Top-most matches move with their subtree; matched descendants of
      // another match travel with their parent.
      const collect = (threads: Thread[]) => {
        for (const t of threads) {
          if (ids.has(t.id)) found.set(t.id, t);
          else collect(t.threads ?? []);
        }
      };
      for (const item of w.items) {
        collect(item.kind === "thread" ? [item.thread] : item.project.threads);
      }
    }
    // No-op when nothing matched or the target sits inside a moved subtree
    // (a thread can't nest into itself).
    if (found.size === 0) return;
    if ([...found.values()].some((t) => flattenThreads([t]).some((d) => d.id === targetId))) {
      return;
    }
    const moved = threadIds
      .flatMap((id) => (found.has(id) ? [found.get(id)!] : []))
      // Anchors point at messages in the old parent chat; drop them.
      .map((t) => ({ ...t, parentMessageId: undefined }));
    const prune = (threads: Thread[]): Thread[] =>
      threads
        .filter((t) => !ids.has(t.id))
        .map((t) => (t.threads ? { ...t, threads: prune(t.threads) } : t));
    const insert = (t: Thread): Thread =>
      t.id === targetId
        ? { ...t, threads: [...moved, ...(t.threads ?? [])] }
        : { ...t, threads: t.threads?.map(insert) };
    setWorkspaces((all) =>
      all.map((w) => {
        let items: WorkspaceItem[] = w.items
          .filter((i) => !(i.kind === "thread" && ids.has(i.thread.id)))
          .map((i) =>
            i.kind === "project"
              ? {
                  ...i,
                  project:
                    i.project.id === targetId
                      ? { ...i.project, threads: [...moved, ...prune(i.project.threads)] }
                      : { ...i.project, threads: prune(i.project.threads).map(insert) },
                }
              : { ...i, thread: insert({ ...i.thread, threads: prune(i.thread.threads ?? []) }) },
          );
        if (w.id === targetId) {
          items = [...moved.map((thread) => ({ kind: "thread" as const, thread })), ...items];
        }
        return { ...w, items };
      }),
    );
  };

  /** Renames any entity — workspace (space), project (agent/group), or
   *  thread — by id; ids are unique across all three. */
  const renameEntity = (id: string, name: string) => {
    const rename = (t: Thread): Thread =>
      t.id === id ? { ...t, title: name } : { ...t, threads: t.threads?.map(rename) };
    setWorkspaces((all) =>
      all.map((w) => ({
        ...w,
        name: w.id === id ? name : w.name,
        items: w.items.map((i) =>
          i.kind === "thread"
            ? { ...i, thread: rename(i.thread) }
            : {
                ...i,
                project: {
                  ...i.project,
                  name: i.project.id === id ? name : i.project.name,
                  threads: i.project.threads.map(rename),
                },
              },
        ),
      })),
    );
  };

  /** Reparents projects (agents/groups) into another workspace, appended to
   *  its item list. Projects can't nest, so a workspace is the only target. */
  const moveProjects = (projectIds: string[], workspaceId: string) => {
    const ids = new Set(projectIds);
    const found = workspaces.flatMap((w) =>
      w.items.flatMap((i) => (i.kind === "project" && ids.has(i.project.id) ? [i.project] : [])),
    );
    if (found.length === 0) return;
    setWorkspaces((all) =>
      all.map((w) => {
        const items = w.items.filter(
          (i) => !(i.kind === "project" && ids.has(i.project.id)),
        );
        if (w.id === workspaceId) {
          items.push(...found.map((project) => ({ kind: "project" as const, project })));
        }
        return { ...w, items };
      }),
    );
  };

  /** Removes the given threads (and their subtrees) from the hierarchy. */
  const deleteThreads = (threadIds: string[]) => {
    const ids = new Set(threadIds);
    const prune = (threads: Thread[]): Thread[] =>
      threads
        .filter((t) => !ids.has(t.id))
        .map((t) => (t.threads ? { ...t, threads: prune(t.threads) } : t));
    setWorkspaces((all) =>
      all.map((w) => ({
        ...w,
        items: w.items
          .filter((i) => !(i.kind === "thread" && ids.has(i.thread.id)))
          .map((i) =>
            i.kind === "project"
              ? { ...i, project: { ...i.project, threads: prune(i.project.threads) } }
              : { ...i, thread: { ...i.thread, threads: prune(i.thread.threads ?? []) } },
          ),
      })),
    );
    if (selection && ids.has(selection.id)) setSelection(null);
  };

  /** Removes a group (project) and everything inside it. */
  const deleteProject = (projectId: string) => {
    const item = workspaces
      .flatMap((w) => w.items)
      .find((i) => i.kind === "project" && i.project.id === projectId);
    const ids = new Set([
      projectId,
      ...(item?.kind === "project" ? flattenThreads(item.project.threads).map((t) => t.id) : []),
    ]);
    setWorkspaces((all) =>
      all.map((w) => ({
        ...w,
        items: w.items.filter((i) => !(i.kind === "project" && i.project.id === projectId)),
      })),
    );
    if (selection && ids.has(selection.id)) setSelection(null);
  };

  /** Appends a user message to a workspace main chat, project chat, or
   *  thread — targetId is unique across all three, so map everything. */
  const sendMessage = (targetId: string, text: string) => {
    // Normally typing materializes first, but cover direct sends too.
    if (pendingReply && targetId === pendingReply.thread.id) materializePendingReply();
    setDrafts((d) => ({ ...d, [targetId]: "" }));
    const message: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      at: new Date().toISOString(),
    };
    const append = (t: Thread): Thread =>
      t.id === targetId
        ? { ...t, messages: [...t.messages, message] }
        : { ...t, threads: t.threads?.map(append) };
    setWorkspaces((all) =>
      all.map((w) => {
        if (w.id === targetId) return { ...w, messages: [...w.messages, message] };
        return {
          ...w,
          items: w.items.map((i) => {
            if (i.kind === "thread") return { ...i, thread: append(i.thread) };
            if (i.project.id === targetId) {
              return { ...i, project: { ...i.project, messages: [...i.project.messages, message] } };
            }
            return { ...i, project: { ...i.project, threads: i.project.threads.map(append) } };
          }),
        };
      }),
    );
  };

  // Any drift from the loaded seed — hierarchy edits or unsent drafts —
  // makes the demo "dirty" and offers Reset.
  const isDirty =
    workspaces !== seedRef || Object.values(drafts).some((t) => t.trim());

  // Mobile back-to-root: clears the selection, popping the push stack to the
  // home list (abandoning any still-empty pending reply, like navigating
  // away does).
  const popToRoot = () => {
    setSelection(null);
    setPendingReply(null);
  };

  return (
    <div data-capture-root className="flex h-full flex-col gap-6 p-8">
      {/* Top tabs: the full comparison vs the shortlisted finalists. */}
      {!chromeless && (
        <div className="flex justify-center">
          <SegmentedControl
            value={focusMode}
            onChange={changeFocusMode}
            options={[
              { value: "all", label: "All Approaches" },
              { value: "selects", label: "Selects" },
            ]}
          />
        </div>
      )}
      {/* Window row: the settings panel sits in flow beside the mock window
          (never overlapping it), both centered on the same vertical axis. */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-6">
        {/* Prototype settings panel. Sized by its widest (nowrap) label so it
            never slides under the window, and static so switching can't jitter.
            Always as tall as the window beside it; on short viewports it
            scrolls internally instead of painting over the chart below. */}
        {!chromeless && (
        <aside className="flex h-full min-h-0 shrink-0 flex-col rounded-window bg-chrome shadow-sm">
          <div className="scrollbar-overlay gutter-stable pr-gutter-5 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-2 pl-5 pt-5">
          {/* First so toggling the mobile-only settings below never reflows
              this control's position. */}
          <SegmentedControl
            value={device}
            onChange={(d) => {
              setDevice(d);
              // Mobile starts on the outermost index (home list) — no stale
              // pushed stack, and no push animation on the switch itself.
              // Desktop always shows a chat pane, so restore the default
              // selection if mobile left none.
              if (d === "mobile") {
                popToRoot();
              } else if (!selection) {
                setSelection({ id: dataState === "start" ? HOME_ID : "ws-acme", mode: "full" });
              }
            }}
            options={[
              { value: "desktop", label: "Desktop" },
              { value: "mobile", label: "Mobile (WIP)" },
            ]}
          />
          <SettingsSection
            // Version stamp rides along so a Vercel deploy is identifiable.
            title={`Hierarchy Approach · v${version}`}
            value={homeVariant}
            onChange={setHomeVariant}
          // Each layout is named by its entity types, top-down as they appear
          // in the sidebar; the two reference layouts keep their codenames as
          // parentheticals. Numbered ids group near-identical concepts as
          // letter variants (1A/1B); SQ and Dev Proposal aren't alternatives,
          // so they stay unnumbered. Selects narrows to the finalists.
          options={
            focusMode === "selects"
              ? [
                  { value: "sections", label: "1B. Spaces, Agents, Threads (Home Section)" },
                  { value: "flat", label: "5A. Chats, Agents, Threads" },
                ]
              : [
                  { value: "sq", label: "Spaces, Chats (SQ)" },
                  {
                    value: "projects-separate",
                    label: "Projects, Spaces, Chats (Dev Proposal)",
                    dividerAfter: true,
                  },
                  { value: "distinct", label: "1A. Spaces, Agents, Threads ⭐" },
                  { value: "sections", label: "1B. Spaces, Agents, Threads (Home Section)" },
                  { value: "all-projects", label: "2. Projects, Chats" },
                  { value: "projects-readonly", label: "3. Workspaces, Read-Only Groups, Chats ⭐" },
                  { value: "space-agent-readonly", label: "4A. Agents, Read-Only Groups, Threads" },
                  { value: "space-agent", label: "4B. Agents, Chat-able Groups, Threads ⭐" },
                  { value: "flat", label: "5A. Chats, Agents, Threads ⭐" },
                  { value: "flat-home-agent", label: "5B. Chats, Agents, Threads (Home Agent)" },
                ]
          }
          />
          {/* Desktop-only fork: keep the variant's entity hierarchy, or
              replace it with a flat list bucketed by last activity. */}
          {device === "desktop" && (
            <SettingsSection
              title="Sort"
              value={sortMode}
              onChange={setSortMode}
              options={[
                { value: "entities", label: "By Entity" },
                { value: "recency", label: "By Recency" },
              ]}
            />
          )}
          {/* Mobile-only fork: how a top-level container exposes its child
              index — nav-bar sheet vs the footer chat/index swap. */}
          {device === "mobile" && (
            <SettingsSection
              title="Index"
              value={indexStyle}
              onChange={setIndexStyle}
              options={[
                { value: "sheet", label: "Sheet" },
                { value: "footer", label: "Footer" },
              ]}
            />
          )}
          <SettingsSection
            title="State"
            value={dataState}
            onChange={changeDataState}
            options={[
              { value: "start", label: "Start" },
              { value: "simple", label: "Simple" },
              { value: "complex", label: "Complex" },
            ]}
          />
          {/* Desktop-only (the phone frame is fixed-size): what shape the
              window locks to in focus mode, for known recording dimensions. */}
          {device === "desktop" && (
            <div className="flex flex-col gap-1">
              <span className="px-1.5 text-sm text-quaternary">Focus Ratio</span>
              <SegmentedControl
                value={focusRatio}
                onChange={setFocusRatio}
                options={FOCUS_RATIO_OPTIONS}
              />
            </div>
          )}
          </div>
          {/* Fixed footer so Reset can't scroll out of view; always rendered
              (disabled when pristine) so the panel never jumps. */}
          <div className="flex shrink-0 flex-col gap-2 px-5 pb-5 pt-2">
            <button
              type="button"
              onClick={() => setChromeless(true)}
              title="Show only the window, for clean recordings (Esc exits)"
              className="flex h-7 w-full items-center justify-center gap-1.5 rounded-full bg-elevated text-base text-secondary shadow-[0_0_0_1px_var(--border-tertiary)] transition-colors duration-fast hover:bg-quaternary-opaque hover:text-primary"
            >
              <Icon name="focus-window" size="sm" color="secondary" />
              Focus
            </button>
            <button
              type="button"
              onClick={resetToSeed}
              disabled={!isDirty}
              className="flex h-7 w-full items-center justify-center gap-1.5 rounded-full bg-elevated text-base text-secondary shadow-[0_0_0_1px_var(--border-tertiary)] transition-colors duration-fast enabled:hover:bg-quaternary-opaque enabled:hover:text-primary disabled:opacity-40"
            >
              <Icon name="arrow-ccw" size="sm" color="secondary" />
              Reset
            </button>
          </div>
        </aside>
        )}
        {device === "desktop" ? (
          // The mock window fills all remaining space inside the page
          // padding — unless focus mode locks it to a recording ratio, in
          // which case it's the largest such rect that fits, centered.
          <div
            className={clsx(
              "flex min-w-0 overflow-hidden rounded-window bg-sidebar shadow-window backdrop-blur-[12px]",
              chromeless && focusRatio !== "fill" ? "max-h-full max-w-full" : "h-full w-full",
            )}
            style={chromeless ? focusRatioStyle(focusRatio) : undefined}
          >
            <Sidebar
              workspaces={displayWorkspaces}
              homeVariant={homeVariant}
              sortMode={sortMode}
              selectedId={selection?.id ?? null}
              renameRequestId={renameRequestId}
              onRenameRequestHandled={() => setRenameRequestId(null)}
              onSelect={select}
              onCreateChat={createChat}
              onCreateThread={createThread}
              onCreateProject={createProject}
              onCreateSpace={createSpace}
              onGroup={groupThreads}
              onMove={moveThreads}
              onMoveProject={moveProjects}
              onRename={renameEntity}
              onDelete={deleteThreads}
              onDeleteProject={deleteProject}
            />
            <main className="flex min-w-0 flex-1 border-l border-tertiary bg-chrome">
              <ChatPanel
                path={path}
                mode={selection?.mode ?? "full"}
                workspaces={displayWorkspaces}
                // Match the sidebar: these variants render spaces as circles.
                spaceBadgeShape={
                  homeVariant === "flat" ||
                  homeVariant === "flat-home-agent" ||
                  homeVariant === "space-agent" ||
                  homeVariant === "space-agent-readonly"
                    ? "circle"
                    : "chiclet"
                }
                // Group badges match the sidebar: faces in the agent-noun
                // layouts, folders in space-agent, plain icons in
                // all-projects, circles elsewhere (agents always wear faces).
                projectBadge={
                  AGENT_NOUN_VARIANTS.includes(homeVariant)
                    ? "face"
                    : homeVariant === "space-agent"
                      ? "folder"
                      : homeVariant === "all-projects"
                        ? "icon"
                        : "kind"
                }
                homeAsAgent={homeVariant === "flat-home-agent"}
                drafts={drafts}
                onDraftChange={setDraft}
                onSelect={select}
                onMove={moveThreads}
                onCreateChat={createChat}
                onCreateThread={createThread}
                onSendMessage={sendMessage}
              />
            </main>
          </div>
        ) : (
          // Phone frame, centered in the window row. The mobile type ramp
          // applies inside it, and nesting renders as push navigation.
          <div className="flex h-full w-full min-w-0 items-center justify-center">
            {/* 34px radius keeps the frame concentric with the 44px capsule
                controls inside it (22px radius + 12px inset). */}
            <div className="type-mobile relative h-full max-h-[844px] w-[390px] overflow-hidden rounded-[34px] bg-sidebar shadow-window backdrop-blur-[12px]">
              <MobileShell
                workspaces={displayWorkspaces}
                homeVariant={homeVariant}
                indexStyle={indexStyle}
                path={path}
                selectedId={selection?.id ?? null}
                drafts={drafts}
                onDraftChange={setDraft}
                onSelect={select}
                onPopToRoot={popToRoot}
                onCreateChat={createChat}
                onCreateThread={createThread}
                onSendMessage={sendMessage}
              />
            </div>
          </div>
        )}
      </div>
      {/* Full-width chart row, inset only by the page padding. Selects drops
          it — the window takes the reclaimed height. */}
      {focusMode === "all" && !chromeless && <AnalogyChart variant={homeVariant} />}
      {/* Chromeless corner controls: invisible until hovered so they never
          show up in a recording; Esc exits without touching the mouse. */}
      {chromeless && (
        <div
          data-export-hide
          className="fixed right-4 top-4 z-50 flex items-center gap-2 opacity-0 transition-opacity duration-fast hover:opacity-100"
        >
          {device === "desktop" && (
            <div className="rounded-full bg-chrome p-1 shadow-sm">
              <SegmentedControl
                value={focusRatio}
                onChange={setFocusRatio}
                options={FOCUS_RATIO_OPTIONS}
              />
            </div>
          )}
          <button
            type="button"
            onClick={exportShot}
            title="Download the viewport as a PNG"
            className="flex h-8 items-center gap-1.5 rounded-full bg-chrome px-3 text-sm text-secondary shadow-sm transition-colors duration-fast hover:text-primary"
          >
            <Icon name="camera" size="sm" color="inherit" />
            Export PNG
          </button>
          <button
            type="button"
            onClick={() => setChromeless(false)}
            title="Exit focus (Esc)"
            className="flex h-8 items-center gap-1.5 rounded-full bg-chrome px-3 text-sm text-secondary shadow-sm transition-colors duration-fast hover:text-primary"
          >
            <Icon name="corners-in" size="sm" color="inherit" />
            Exit Focus
          </button>
        </div>
      )}
    </div>
  );
}
