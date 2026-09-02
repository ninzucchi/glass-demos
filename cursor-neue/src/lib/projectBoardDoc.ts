import type { JSONContent } from "@tiptap/core";
import {
  PR_BOARD_STATES,
  PR_STATE_LABEL,
  type PrState,
  type PullRequest,
} from "@/data/pullRequests";
import { taskFileHref } from "@/data/taskFiles";
import { type Task, type TaskStatus } from "@/data/tasks";
import { agentDisplayTitle } from "@/lib/agentDisplayName";
import { taskTicketId } from "@/lib/taskTicketId";
import { agentLinkNode } from "@/components/tiptap-node/agent-link-node/agent-link-node-extension";
import { prLinkNode } from "@/components/tiptap-node/pr-link-node/pr-link-node-extension";
import {
  AGENT_STATUS_LABEL,
  AGENT_TRAY_STATUSES,
  type Agent,
  type AgentStatus,
} from "@/types";

/** Document Tasks order. For Review leads. Done stays last. */
const TASK_DOC_STATUSES: TaskStatus[] = [
  "for-review",
  "in-progress",
  "not-started",
  "completed",
];

const TASK_DOC_STATUS_LABEL: Record<TaskStatus, string> = {
  "not-started": "Queued",
  "in-progress": "In Progress",
  "for-review": "For Review",
  completed: "Done",
};

const space = (): JSONContent => ({ type: "text", text: " " });

function taskTitleContent(
  task: Task,
  projectId: string | undefined,
  showIds: boolean,
  strikeTitle: boolean,
  tags: JSONContent[],
): JSONContent {
  const titleMarks = strikeTitle ? [{ type: "strike" }] : undefined;
  const content: JSONContent[] = [];
  if (showIds) {
    content.push({
      type: "text",
      text: taskTicketId(projectId, task),
      marks: [
        { type: "code" },
        { type: "link", attrs: { href: taskFileHref(projectId ?? "", task) } },
      ],
    });
    content.push(space(), {
      type: "text",
      text: task.title,
      ...(titleMarks ? { marks: titleMarks } : {}),
    });
  } else {
    content.push({
      type: "text",
      text: task.title,
      ...(titleMarks ? { marks: titleMarks } : {}),
    });
  }
  for (const tag of tags) {
    content.push(space(), tag);
  }
  return { type: "paragraph", content };
}

export type BoardDocSurface = "tasks" | "agents" | "prs";

const heading = (level: 1 | 2 | 3, text: string): JSONContent => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const paragraph = (text: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

function showTaskAgent(task: Task, agent: Agent): boolean {
  switch (task.status) {
    case "not-started":
    case "completed":
      return false;
    case "in-progress":
      return agent.status === "running";
    case "for-review":
      return agent.status === "unread" || agent.status === "idle";
    default: {
      const _exhaustive: never = task.status;
      return _exhaustive;
    }
  }
}

function showTaskPr(task: Task, pr: PullRequest): boolean {
  switch (task.status) {
    case "not-started":
      return false;
    case "in-progress":
      return true;
    case "for-review":
      return pr.state === "open";
    case "completed":
      return pr.state === "merged" || pr.state === "closed";
    default: {
      const _exhaustive: never = task.status;
      return _exhaustive;
    }
  }
}

function taskItemWithTags(
  task: Task,
  checked: boolean,
  agents: Agent[],
  prs: PullRequest[],
  projectId: string | undefined,
  showIds: boolean,
): JSONContent {
  const tags: JSONContent[] = [];
  const pr = task.prId ? prs.find((item) => item.id === task.prId) : undefined;
  if (pr && showTaskPr(task, pr)) tags.push(prLinkNode(pr, `#${pr.number}`));
  const agent = task.agentId ? agents.find((item) => item.id === task.agentId) : undefined;
  if (agent && showTaskAgent(task, agent)) tags.push(agentLinkNode(agent, showIds));
  return {
    type: "taskItem",
    attrs: { checked },
    content: [taskTitleContent(task, projectId, showIds, checked, tags)],
  };
}

const taggedTaskList = (
  items: Task[],
  checked: boolean,
  agents: Agent[],
  prs: PullRequest[],
  projectId: string | undefined,
  showIds: boolean,
): JSONContent => ({
  type: "taskList",
  content: items.map((task) =>
    taskItemWithTags(task, checked, agents, prs, projectId, showIds),
  ),
});

const bulletItem = (content: JSONContent): JSONContent => ({
  type: "listItem",
  content: [{ type: "paragraph", content: [content] }],
});

const bulletList = (items: JSONContent[]): JSONContent => ({
  type: "bulletList",
  content: items.map((item) => bulletItem(item)),
});

const bulletTexts = (items: string[]): JSONContent =>
  bulletList(items.map((text) => ({ type: "text", text })));

const textLink = (label: string, href: string): JSONContent => ({
  type: "text",
  text: label,
  marks: [{ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } }],
});

const divider = (): JSONContent => ({ type: "horizontalRule" });

type BoardDocMeta = {
  resolved: string[];
  links: { label: string; href: string }[];
};

const DEFAULT_META: BoardDocMeta = {
  resolved: [
    "Project docs own the brief; the transcript header stays title and counts only",
    "Finished work sits under Done in the tracker doc",
  ],
  links: [
    { label: "Linear — Glass", href: "https://linear.app/everysphere/project/glass" },
    { label: "Notion RFC — Glass tracker", href: "https://notion.so/everysphere/glass-tracker-rfc" },
    { label: "Standup minutes", href: "https://notion.so/everysphere/glass-standup" },
    { label: "Figma — Glass chrome", href: "https://www.figma.com/design/glass-chrome" },
  ],
};

const BOARD_META: Record<string, BoardDocMeta> = {
  "p-sidebar": {
    resolved: [
      "Pin is a sidebar list only. Children stay nested under the project folder.",
      "Unread badge lives in the trailing slot so the title can truncate.",
      "The collapse chevron stays in the header and no longer covers the badge.",
    ],
    links: [
      { label: "Linear — Sidebar redesign", href: "https://linear.app/everysphere/project/sidebar-redesign" },
      { label: "Notion RFC — Projects in the sidebar", href: "https://notion.so/everysphere/rfc-projects-sidebar" },
      { label: "Standup minutes — Aug 28", href: "https://notion.so/everysphere/sidebar-standup-2026-08-28" },
      { label: "Figma — Sidebar density", href: "https://www.figma.com/design/glass-sidebar-density" },
      { label: "Slack — #proj-sidebar", href: "https://everysphere.slack.com/archives/proj-sidebar" },
    ],
  },
  "p-keyboard": {
    resolved: [
      "The tab bar is one tab stop. Left and right move. Home and End jump the ends.",
      "Escape dismisses a row menu and returns focus to the row that opened it.",
      "Focus rings use a luminous outline so they read on glass in both themes.",
    ],
    links: [
      { label: "Linear — Keyboard accessibility", href: "https://linear.app/everysphere/project/keyboard-a11y" },
      { label: "Notion RFC — One focus model", href: "https://notion.so/everysphere/rfc-glass-focus-model" },
      { label: "Standup minutes — Aug 25", href: "https://notion.so/everysphere/a11y-standup-2026-08-25" },
      { label: "Figma — Focus rings", href: "https://www.figma.com/design/glass-focus-rings" },
      { label: "WCAG 2.2 — Keyboard", href: "https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html" },
    ],
  },
  "p-base-ui": {
    resolved: [
      "Base gray maps onto --bg-*, --text-*, and --border-* only.",
      "The sidebar scroll viewport wraps the list. The sticky footer stays outside it.",
      "Appearance light/dark is a Base Switch. The label stays outside the control.",
    ],
    links: [
      { label: "Linear — Base UI migration", href: "https://linear.app/everysphere/project/base-ui-migration" },
      { label: "Notion RFC — Glass on Base primitives", href: "https://notion.so/everysphere/rfc-base-ui-glass" },
      { label: "Standup minutes — Aug 27", href: "https://notion.so/everysphere/base-ui-standup-2026-08-27" },
      { label: "Base UI docs", href: "https://base-ui.com/react/overview/quick-start" },
      { label: "Figma — Primitive inventory", href: "https://www.figma.com/design/glass-base-primitives" },
    ],
  },
};

function boardMeta(projectId?: string): BoardDocMeta {
  if (projectId && BOARD_META[projectId]) return BOARD_META[projectId];
  return DEFAULT_META;
}

function decisionsAndLinks(projectId?: string): JSONContent[] {
  const meta = boardMeta(projectId);
  return [
    divider(),
    heading(2, "Decisions"),
    bulletTexts(meta.resolved),
    divider(),
    heading(2, "Links"),
    bulletList(meta.links.map((item) => textLink(item.label, item.href))),
  ];
}

const SURFACE_TITLE: Record<BoardDocSurface, string> = {
  tasks: "Tasks",
  agents: "Agents",
  prs: "Pull requests",
};

export function boardDocContent({
  surface,
  projectId,
  projectTitle,
  projectBrief,
  tasks,
  agents,
  prs,
  showIds = false,
  showNames = false,
}: {
  surface: BoardDocSurface;
  projectId?: string;
  projectTitle: string;
  projectBrief?: string;
  tasks: Task[];
  agents: Agent[];
  prs: PullRequest[];
  showIds?: boolean;
  showNames?: boolean;
}): JSONContent {
  const namedAgents = showNames
    ? agents.map((item) => ({ ...item, title: agentDisplayTitle(item, "names") }))
    : agents;
  const title = projectTitle.trim() || SURFACE_TITLE[surface];
  const sections: JSONContent[] = [heading(1, title)];
  const brief = projectBrief?.trim();
  if (brief) sections.push(paragraph(brief));
  sections.push(divider(), heading(2, SURFACE_TITLE[surface]));
  const bodyStart = sections.length;
  const addSection = (...nodes: JSONContent[]) => {
    sections.push(...nodes);
  };

  switch (surface) {
    case "tasks": {
      for (const status of TASK_DOC_STATUSES) {
        const group = tasks.filter((task) => task.status === status);
        if (group.length === 0) continue;
        addSection(
          heading(3, TASK_DOC_STATUS_LABEL[status]),
          taggedTaskList(group, status === "completed", namedAgents, prs, projectId, showIds),
        );
      }
      break;
    }
    case "agents": {
      for (const status of AGENT_TRAY_STATUSES) {
        const group = namedAgents.filter((agent) => agent.status === status);
        if (group.length === 0) continue;
        addSection(
          heading(3, AGENT_STATUS_LABEL[status as AgentStatus]),
          bulletList(group.map((agent) => agentLinkNode(agent, showIds))),
        );
      }
      break;
    }
    case "prs": {
      const done: PullRequest[] = [];
      for (const state of PR_BOARD_STATES) {
        const group = prs.filter((item) => item.state === state);
        if (group.length === 0) continue;
        if (state === "merged" || state === "closed") {
          done.push(...group);
          continue;
        }
        addSection(
          heading(3, PR_STATE_LABEL[state as PrState]),
          ...group.map((item) => ({
            type: "paragraph" as const,
            content: [prLinkNode(item)],
          })),
        );
      }
      if (done.length > 0) {
        addSection(
          heading(3, "Done"),
          ...done.map((item) => ({
            type: "paragraph" as const,
            content: [prLinkNode(item)],
          })),
        );
      }
      break;
    }
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }

  if (sections.length === bodyStart) {
    sections.push(paragraph("Nothing in this view yet."));
  }

  sections.push(...decisionsAndLinks(projectId));

  return { type: "doc", content: sections };
}
