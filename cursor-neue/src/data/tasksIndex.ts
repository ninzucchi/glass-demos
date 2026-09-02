import type { JSONContent } from "@tiptap/core";
import { taskFileHref, taskFileStem } from "@/data/taskFiles";
import { TASK_BOARD_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/data/tasks";
import type { BoardTask } from "@/lib/workspaceBoard";
import type { Tab } from "@/types";

/** Context path of the tracker index. One file per project or workspace board. */
export const TASKS_INDEX_FOLDER = "project";
export const TASKS_INDEX_NAME = "tasks.md";

export function isTasksIndexFile(tab: Pick<Tab, "title" | "folder">): boolean {
  return tab.folder === TASKS_INDEX_FOLDER && tab.title === TASKS_INDEX_NAME;
}

export function taskFileNameFromHref(href: string): string | undefined {
  const path = href.split(/[?#]/)[0] ?? "";
  const name = path.split("/").pop();
  return name?.endsWith(".md") ? name : undefined;
}

function tasksByStatus(tasks: readonly BoardTask[], status: TaskStatus): BoardTask[] {
  return tasks.filter((task) => task.status === status);
}

function taskHref(task: BoardTask): string {
  return taskFileHref(task.projectId, task);
}

/** Kanban source as structured markdown. Status order matches the board. */
export function tasksIndexMarkdown(tasks: readonly BoardTask[]): string {
  const columns = TASK_BOARD_STATUSES.map((status) => `  - ${TASK_STATUS_LABEL[status]}`).join("\n");
  const lines = [
    "---",
    "title: Tasks",
    "view: kanban",
    "columns:",
    columns,
    "---",
    "",
  ];
  for (const status of TASK_BOARD_STATUSES) {
    lines.push(`## ${TASK_STATUS_LABEL[status]}`, "");
    const items = tasksByStatus(tasks, status);
    if (items.length === 0) {
      lines.push("");
      continue;
    }
    for (const task of items) {
      const stem = taskFileStem(task.projectId, task);
      lines.push(`- [${stem}](${taskHref(task)}) ${task.title}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

const heading = (level: 1 | 2 | 3, text: string): JSONContent => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const yamlBlock = (text: string): JSONContent => ({
  type: "codeBlock",
  attrs: { language: "yaml" },
  content: [{ type: "text", text }],
});

const textLink = (label: string, href: string): JSONContent => ({
  type: "text",
  text: label,
  marks: [{ type: "link", attrs: { href } }],
});

function taskListItem(task: BoardTask): JSONContent {
  const stem = taskFileStem(task.projectId, task);
  return {
    type: "listItem",
    content: [
      {
        type: "paragraph",
        content: [textLink(stem, taskHref(task)), { type: "text", text: ` ${task.title}` }],
      },
    ],
  };
}

function statusSection(status: TaskStatus, tasks: readonly BoardTask[]): JSONContent[] {
  const items = tasksByStatus(tasks, status);
  const nodes: JSONContent[] = [heading(2, TASK_STATUS_LABEL[status])];
  if (items.length === 0) return nodes;
  nodes.push({
    type: "bulletList",
    content: items.map(taskListItem),
  });
  return nodes;
}

/** TipTap document for project/tasks.md. Frontmatter is the board schema. */
export function tasksIndexContent(tasks: readonly BoardTask[]): JSONContent {
  const frontmatter = tasksIndexMarkdown(tasks).split("\n\n")[0] ?? "";
  return {
    type: "doc",
    content: [
      heading(1, "Tasks"),
      yamlBlock(frontmatter),
      ...TASK_BOARD_STATUSES.flatMap((status) => statusSection(status, tasks)),
    ],
  };
}
