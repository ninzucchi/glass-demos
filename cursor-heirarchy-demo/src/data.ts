import raw from "./workspaces.json";
import type { SelectionPath, Thread, Workspace } from "./types";

/** Seed hierarchy, loaded from the editable JSON. Runtime creations (new
 *  chats/threads) layer on top of this in App state. */
export const initialWorkspaces = raw as unknown as Workspace[];

/** Ancestor chain (outermost first, target last) to the thread with the
 *  given id, searching nested subthreads. */
function findThreadPath(threads: Thread[], id: string): Thread[] | undefined {
  for (const t of threads) {
    if (t.id === id) return [t];
    const sub = findThreadPath(t.threads ?? [], id);
    if (sub) return [t, ...sub];
  }
  return undefined;
}

/** Every thread in the list plus all nested subthreads, depth-first. */
export function flattenThreads(threads: Thread[]): Thread[] {
  return threads.flatMap((t) => [t, ...flattenThreads(t.threads ?? [])]);
}

/** Resolve a workspace, project, or thread id to its full hierarchy path. */
export function resolvePath(workspaces: Workspace[], id: string): SelectionPath | undefined {
  for (const workspace of workspaces) {
    if (workspace.id === id) return { workspace };
    for (const item of workspace.items) {
      if (item.kind === "thread") {
        const threadPath = findThreadPath([item.thread], id);
        if (threadPath) return { workspace, threadPath };
      } else {
        if (item.project.id === id) return { workspace, project: item.project };
        const threadPath = findThreadPath(item.project.threads, id);
        if (threadPath) return { workspace, project: item.project, threadPath };
      }
    }
  }
  return undefined;
}
