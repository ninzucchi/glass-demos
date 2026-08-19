import type { IconName } from "./icons/iconNames";

export interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  /** Seconds shown in the agent turn's "Thought Ns" header. */
  thoughtSecs?: number;
  /** ISO timestamp; drives ordering and time dividers. */
  at: string;
}

export interface Thread {
  id: string;
  title: string;
  /** ISO timestamp; fallback anchor when parentMessageId is absent. */
  createdAt: string;
  /** Base message in the parent chat this thread replies to; its "N Replies"
   *  affordance renders directly under that message. */
  parentMessageId?: string;
  /** The highlighted text the reply was made from, quoted above the composer
   *  while the thread is still empty (from cursor-neue's ThreadRef). */
  excerpt?: string;
  /** Agent-spawned threads (e.g. concurrent workstreams split off a request)
   *  render as cards under the base message instead of plain reply pills. */
  createdBy?: "user" | "agent";
  /** Shown in the sidebar's Pinned section. */
  pinned?: boolean;
  messages: Message[];
  /** Sub-threads spawned off this thread's messages; nesting is unbounded. */
  threads?: Thread[];
}

export interface Project {
  id: string;
  name: string;
  /** Persistent agent (e.g. EA) vs ad-hoc thread grouping; some sidebar
   *  variants render the two differently. Missing means agent. */
  kind?: "agent" | "group";
  /** ISO timestamp; when set, threads grouped in at creation collapse into a
   *  single "Created group" timeline event instead of per-thread events. */
  createdAt?: string;
  /** Circle badge glyph; falls back to the name's initial letter. */
  icon?: IconName;
  /** The project's main-chat transcript; threads interleave by time. */
  messages: Message[];
  threads: Thread[];
}

export type WorkspaceItem =
  | { kind: "thread"; thread: Thread }
  | { kind: "project"; project: Project };

export interface Workspace {
  id: string;
  name: string;
  /** Chiclet badge glyph; falls back to the name's initial letter. */
  icon?: IconName;
  /** The workspace main chat's transcript; loose threads interleave by time. */
  messages: Message[];
  items: WorkspaceItem[];
}

/** How a selected thread is presented: fullscreen when opened directly (e.g.
 *  sidebar), split beside the parent chat when opened from its timeline. */
export type ViewMode = "full" | "split";

/** Resolved location of a selected node within the hierarchy. */
export interface SelectionPath {
  workspace: Workspace;
  project?: Project;
  /** Ancestor chain from the outermost thread down to the selected one;
   *  the last entry is the selection itself. */
  threadPath?: Thread[];
}
