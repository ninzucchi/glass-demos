import { type FileTreeNode, type RecentFile } from "@/data/files";
import { taskFileName } from "@/data/taskFiles";
import type { BoardTask } from "@/lib/workspaceBoard";

const folder = (name: string, children: FileTreeNode[] = []): FileTreeNode => ({
  kind: "folder",
  name,
  children,
});
const file = (name: string): FileTreeNode => ({ kind: "file", name });

function taskFiles(tasks: readonly BoardTask[]): FileTreeNode[] {
  const names = tasks.map((task) => taskFileName(task.projectId, task));
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return names.map(file);
}

/** Shared context directory. The sidebar root name is the active agent or project. */
export function getContextTree(tasks: readonly BoardTask[] = []): FileTreeNode[] {
  return [
    folder("project", [
      folder("docs"),
      folder("inbox"),
      folder("internal"),
      folder("media"),
      folder("tasks", taskFiles(tasks)),
      file("archive.md"),
      file("notes.md"),
      file("tasks.md"),
    ]),
    folder("user"),
  ];
}

/** Flatten the context tree (depth-first) and return the first `count` files. */
export function getRecentContextFiles(
  tasks: readonly BoardTask[] = [],
  count = 4,
): RecentFile[] {
  const out: RecentFile[] = [];
  const walk = (nodes: FileTreeNode[], parentPath: string) => {
    for (const n of nodes) {
      if (out.length >= count) return;
      if (n.kind === "file") out.push({ name: n.name, folder: parentPath });
      else walk(n.children, parentPath ? `${parentPath}/${n.name}` : n.name);
    }
  };
  walk(getContextTree(tasks), "");
  return out;
}
