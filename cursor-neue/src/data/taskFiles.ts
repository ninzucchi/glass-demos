import type { JSONContent } from "@tiptap/core";
import { pullRequestById } from "@/data/pullRequests";
import { TASKS_BY_PROJECT, type Task, type TaskStatus } from "@/data/tasks";
import { taskTicketId } from "@/lib/taskTicketId";
import type { Tab } from "@/types";

/** Context tree path that holds one markdown file per board task. */
export const TASK_CONTEXT_FOLDER = "project/tasks";

const TASK_FILE_STATUS: Record<TaskStatus, string> = {
  "not-started": "Todo",
  "in-progress": "In Progress",
  "for-review": "In Review",
  completed: "Done",
};

const TASK_FILE_PRIORITY: Record<TaskStatus, string> = {
  "not-started": "Low",
  "in-progress": "High",
  "for-review": "Medium",
  completed: "No priority",
};

/** Descriptions for tasks that do not already have a PR body. */
const TASK_FILE_DESCRIPTION: Record<string, string> = {
  "t-sb-4": "The collapse chevron must stay clear of the unread badge at compact density.",
  "t-sb-5": "Recents should group into day buckets so the list does not read as a flat dump.",
  "t-kb-3": "Up and down should move between visible sidebar rows. Home and End still need wiring.",
  "t-kb-6": "The tab bar should be one tab stop. Arrow keys move between tabs.",
  "t-kb-8": "Status dots are color-only. Each row should expose a status name to VoiceOver.",
  "t-kb-10": "The project agents menu should filter as you type.",
  "t-bu-3": "Customize and the composer surface should share one Base Dialog.",
  "t-bu-4": "Base gray must map onto --bg-*, --text-*, and --border-* only.",
  "t-bu-10": "The wallpaper picker should be a Base Radio group. Preview tiles stay our layout.",
  "t-bu-12": "Project folder open state should use Base Collapsible. Height animate stays ours.",
  "t-bu-13": "Sidebar and tab right-click menus should share Base Context Menu.",
  "t-bu-17": "Agents/PRs and the debug chips should share one segmented primitive.",
  "t-bu-18": "The new-project name field should use Base Field + Input.",
};

export function taskFileStem(projectId: string, task: Pick<Task, "id">): string {
  return taskTicketId(projectId, task).slice(1);
}

export function taskFileName(projectId: string, task: Pick<Task, "id">): string {
  return `${taskFileStem(projectId, task)}.md`;
}

/** Relative href from a project doc or tasks.md into project/tasks/. */
export function taskFileHref(projectId: string, task: Pick<Task, "id">): string {
  return `tasks/${taskFileName(projectId, task)}`;
}

export function taskContextTab(projectId: string, task: Pick<Task, "id">): Partial<Tab> {
  return {
    type: "context",
    title: taskFileName(projectId, task),
    folder: TASK_CONTEXT_FOLDER,
  };
}

export function isTaskContextFile(tab: Pick<Tab, "title" | "folder">): boolean {
  return tab.folder === TASK_CONTEXT_FOLDER && (tab.title ?? "").endsWith(".md");
}

export function findTaskByFileName(
  name: string,
): { task: Task; projectId: string } | undefined {
  if (!name.endsWith(".md")) return undefined;
  const stem = name.slice(0, -3);
  for (const [projectId, list] of Object.entries(TASKS_BY_PROJECT)) {
    for (const task of list) {
      if (taskFileStem(projectId, task) === stem) return { task, projectId };
    }
  }
  return undefined;
}

function yamlScalar(value: string): string {
  if (value === "") return "";
  if (/[:#{}[\],&*?|<>=!%@`]/.test(value) || /[\n"]/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

export function taskFileDescription(task: Task): string {
  if (TASK_FILE_DESCRIPTION[task.id]) return TASK_FILE_DESCRIPTION[task.id];
  if (task.prId) {
    const pr = pullRequestById(task.prId);
    if (pr) return pr.description;
  }
  return `${task.title}.`;
}

/** Linear-style issue file: YAML frontmatter plus a markdown body. */
export function taskFileMarkdown(task: Task, assignee: string): string {
  const fields = [
    `title: ${yamlScalar(task.title)}`,
    `status: ${TASK_FILE_STATUS[task.status]}`,
    `priority: ${TASK_FILE_PRIORITY[task.status]}`,
    `assignee: ${yamlScalar(assignee)}`,
  ];
  return `---\n${fields.join("\n")}\n---\n\n${taskFileDescription(task)}\n`;
}

const heading = (level: 1 | 2 | 3, text: string): JSONContent => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const paragraph = (text: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

const yamlBlock = (text: string): JSONContent => ({
  type: "codeBlock",
  attrs: { language: "yaml" },
  content: [{ type: "text", text }],
});

/** TipTap document for a task file. Frontmatter is the Linear schema. */
export function taskFileContent(task: Task, assignee: string): JSONContent {
  const frontmatter = taskFileMarkdown(task, assignee).split("\n\n")[0] ?? "";
  const body = taskFileDescription(task);
  return {
    type: "doc",
    content: [
      heading(1, task.title),
      yamlBlock(frontmatter),
      ...body.split(/\n\n+/).map((block) => paragraph(block)),
    ],
  };
}
