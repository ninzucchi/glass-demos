import type { IconName } from "@/icons/iconNames";

export type TaskStatus = "not-started" | "in-progress" | "for-review" | "completed";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  agentId?: string;
  prId?: string;
}

/** Native order: Not Started is last. Empty columns still go after filled ones. */
export const TASK_BOARD_STATUSES: TaskStatus[] = [
  "in-progress",
  "for-review",
  "completed",
  "not-started",
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "for-review": "Ready for Review",
  completed: "Done",
};

const STATUS_ICON: Record<TaskStatus, IconName> = {
  "not-started": "circle-dashed",
  "in-progress": "spinner",
  "for-review": "circle",
  completed: "check-circle",
};

export const taskStatusIcon = (status: TaskStatus): IconName => STATUS_ICON[status];

const task = (
  id: string,
  title: string,
  status: TaskStatus,
  links?: { agentId?: string; prId?: string },
): Task => ({
  id,
  title,
  status,
  ...links,
});

/** Seed tasks keyed by project id. Counts track each project's agents and PRs.
 *  Not started may have an agent. In progress PRs are drafts.
 *  For review PRs are open. Completed always has both. */
export const TASKS_BY_PROJECT: Record<string, Task[]> = {
  "p-sidebar": [
    task(
      "t-sb-1",
      "Swap the folder glyph for a hover chevron",
      "completed",
      { agentId: "a-sb-1", prId: "pr-sb-1" },
    ),
    task(
      "t-sb-2",
      "Pin a project without flattening its children",
      "for-review",
      { agentId: "a-sb-2", prId: "pr-sb-2" },
    ),
    task(
      "t-sb-3",
      "Move compact unread into the trailing slot",
      "in-progress",
      { agentId: "a-sb-3", prId: "pr-sb-3" },
    ),
    task("t-sb-4", "Keep the collapse chevron off the unread badge", "not-started"),
    task("t-sb-5", "Group recents into day buckets", "not-started"),
  ],
  "p-keyboard": [
    task(
      "t-kb-1",
      "Put composer accessories in one tab sequence",
      "in-progress",
      { agentId: "a-kb-1", prId: "pr-kb-1" },
    ),
    task(
      "t-kb-2",
      "Trap focus inside dropdown menus",
      "for-review",
      { agentId: "a-kb-2", prId: "pr-kb-2" },
    ),
    task("t-kb-3", "Walk sidebar rows with arrow keys", "not-started"),
    task(
      "t-kb-4",
      "Close context menus with Escape",
      "completed",
      { agentId: "a-kb-5", prId: "pr-kb-4" },
    ),
    task(
      "t-kb-5",
      "Add a skip link into the transcript",
      "completed",
      { agentId: "a-kb-3", prId: "pr-kb-5" },
    ),
    task(
      "t-kb-6",
      "Make the tab bar one tab stop",
      "in-progress",
      { agentId: "a-kb-6" },
    ),
    task(
      "t-kb-7",
      "Keep focus rings visible on glass",
      "for-review",
      { agentId: "a-kb-7", prId: "pr-kb-6" },
    ),
    task("t-kb-8", "Announce agent status to VoiceOver", "not-started"),
    task(
      "t-kb-9",
      "Restore focus after a tile closes",
      "completed",
      { agentId: "a-kb-9", prId: "pr-kb-8" },
    ),
    task(
      "t-kb-10",
      "Typeahead in the project agents menu",
      "not-started",
      { agentId: "a-kb-10" },
    ),
  ],
  "p-base-ui": [
    task(
      "t-bu-1",
      "Port dock and tab menus to Base Menu",
      "in-progress",
      { agentId: "a-bu-1", prId: "pr-bu-1" },
    ),
    task(
      "t-bu-2",
      "Move workspace hovers onto Base Tooltip",
      "completed",
      { agentId: "a-bu-2", prId: "pr-bu-2" },
    ),
    task(
      "t-bu-3",
      "Share one Base Dialog for customize and composer",
      "not-started",
      { agentId: "a-bu-3" },
    ),
    task("t-bu-4", "Map Base color ramps onto glass tokens", "not-started"),
    task(
      "t-bu-5",
      "Drive IconButton sizes from Base Button",
      "completed",
      { agentId: "a-bu-4", prId: "pr-bu-5" },
    ),
    task(
      "t-bu-6",
      "Anchor the agents menu on Base Popover",
      "for-review",
      { agentId: "a-bu-6", prId: "pr-bu-6" },
    ),
    task(
      "t-bu-7",
      "Hold the Base Select port for debug chips",
      "completed",
      { agentId: "a-bu-7", prId: "pr-bu-7" },
    ),
    task(
      "t-bu-8",
      "Wrap the sidebar list in Base Scroll Area",
      "completed",
      { agentId: "a-bu-8", prId: "pr-bu-8" },
    ),
    task(
      "t-bu-9",
      "Replace settings checks with Base Checkbox",
      "in-progress",
      { agentId: "a-bu-9", prId: "pr-bu-9" },
    ),
    task(
      "t-bu-10",
      "Turn the wallpaper picker into Base Radio",
      "not-started",
      { agentId: "a-bu-10" },
    ),
    task(
      "t-bu-11",
      "Switch light and dark with Base Switch",
      "completed",
      { agentId: "a-bu-11", prId: "pr-bu-11" },
    ),
    task("t-bu-12", "Drive project folders with Base Collapsible", "not-started"),
    task("t-bu-13", "Share Base Context Menu on sidebar and tabs", "not-started"),
    task(
      "t-bu-14",
      "Filter the workspace switcher with Base Combobox",
      "for-review",
      { agentId: "a-bu-14", prId: "pr-bu-14" },
    ),
    task(
      "t-bu-15",
      "Stack copy and screenshot toasts on Base Toast",
      "completed",
      { agentId: "a-bu-15", prId: "pr-bu-15" },
    ),
    task(
      "t-bu-16",
      "Leave appearance sections as a static stack",
      "completed",
      { agentId: "a-bu-16", prId: "pr-bu-16" },
    ),
    task(
      "t-bu-17",
      "Share one segmented primitive for Agents, PRs, and debug chips",
      "not-started",
      { agentId: "a-bu-17" },
    ),
    task("t-bu-18", "Build the new-project name field on Base Field", "not-started"),
    task(
      "t-bu-19",
      "Confirm project delete with Base Alert Dialog",
      "completed",
      { agentId: "a-bu-19", prId: "pr-bu-19" },
    ),
    task(
      "t-bu-20",
      "Keep the composer doc off Base Input",
      "completed",
      { agentId: "a-bu-20", prId: "pr-bu-20" },
    ),
  ],
};

export const tasksFor = (projectId: string): Task[] => TASKS_BY_PROJECT[projectId] ?? [];
