import type { IconName } from "@/icons/iconNames";

export type PrState = "draft" | "open" | "merged" | "closed";

/** Check / merge line on open and draft cards. Omitted on merged and closed. */
export type PrReviewStatus =
  | "checks-running"
  | "merge-conflicts"
  | "checks-failed"
  | "ready-to-merge";

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  state: PrState;
  /** Epoch ms when the PR opened. Drives the card time. */
  openedAt: number;
  /** First excerpt of the PR body. Cards clamp to two lines. */
  description: string;
  /** Present on draft and open PRs. */
  reviewStatus?: PrReviewStatus;
}

export const PR_BOARD_STATES: PrState[] = ["draft", "open", "merged", "closed"];

export const PR_STATE_LABEL: Record<PrState, string> = {
  draft: "Drafts",
  open: "Open",
  merged: "Merged",
  closed: "Closed",
};

const STATE_ICON: Record<PrState, IconName> = {
  draft: "git-pull-request-draft",
  open: "git-pull-request",
  merged: "git-merge",
  closed: "git-pull-request-closed",
};

const STATE_COLOR: Record<PrState, string> = {
  draft: "var(--icon-tertiary)",
  open: "var(--green)",
  merged: "var(--purple)",
  closed: "var(--red)",
};

export const PR_REVIEW_LABEL: Record<PrReviewStatus, string> = {
  "checks-running": "Running",
  "merge-conflicts": "Conflicts",
  "checks-failed": "Failed",
  "ready-to-merge": "Mergeable",
};

export const prStateIcon = (state: PrState): IconName => STATE_ICON[state];
export const prStateColor = (state: PrState): string => STATE_COLOR[state];
export const prReviewLabel = (status: PrReviewStatus): string => PR_REVIEW_LABEL[status];

const pr = (
  id: string,
  number: number,
  title: string,
  state: PrState,
  openedAt: number,
  description: string,
  reviewStatus?: PrReviewStatus,
): PullRequest => ({
  id,
  number,
  title,
  state,
  openedAt,
  description,
  ...(reviewStatus ? { reviewStatus } : {}),
});

const hour = 3_600_000;
const day = 24 * hour;
const opened = (hoursAgo: number): number => Date.now() - hoursAgo * hour;
const openedDays = (daysAgo: number): number => Date.now() - daysAgo * day;

/** Seed PRs keyed by project id. Counts differ per project. */
export const PULL_REQUESTS_BY_PROJECT: Record<string, PullRequest[]> = {
  "p-sidebar": [
    pr(
      "pr-sb-1",
      104857,
      "Hover chevron on project folders",
      "merged",
      openedDays(6),
      "Swap the project icon for a chevron on hover. The rest glyph stays mounted so the row does not shift.",
    ),
    pr(
      "pr-sb-2",
      100987,
      "Pin project rows without flattening children",
      "open",
      opened(2),
      "Pin is a sidebar list only. Children stay nested under the project folder after pin and unpin.",
      "checks-running",
    ),
    pr(
      "pr-sb-3",
      103421,
      "Unread badge layout at compact density",
      "draft",
      opened(14),
      "The unread badge clips the project title at 12px density. Move it into the trailing slot so the title can truncate.",
      "merge-conflicts",
    ),
  ],
  "p-keyboard": [
    pr(
      "pr-kb-1",
      109876,
      "Tab order through composer accessories",
      "draft",
      opened(0.4),
      "Context chip, input, and dictate should sit in one tab sequence. Tab no longer jumps past the accessories.",
      "ready-to-merge",
    ),
    pr(
      "pr-kb-2",
      105432,
      "Focus trap for dropdown menus",
      "open",
      opened(0.2),
      "Keyboard focus escapes the nav dropdown. Trap focus in the menu and restore it to the trigger on close.",
      "checks-running",
    ),
    pr(
      "pr-kb-3",
      101234,
      "Arrow keys in the sidebar list",
      "open",
      opened(3),
      "Up and down should move between visible sidebar rows. Home and End still need wiring for the long chats list.",
      "checks-failed",
    ),
    pr(
      "pr-kb-4",
      108765,
      "Escape dismisses context menus",
      "merged",
      openedDays(4),
      "Escape closes the row menu and returns focus to the row that opened it.",
    ),
    pr(
      "pr-kb-5",
      102345,
      "Skip link to the transcript",
      "closed",
      openedDays(8),
      "Add a skip control as the first tab stop in the pane so VoiceOver can jump past chrome into the chat.",
    ),
    pr(
      "pr-kb-6",
      106543,
      "Visible focus rings on glass surfaces",
      "open",
      opened(18),
      "Focus rings disappear on glass fills in both themes. Use a luminous outline that stays readable on the sidebar, dock, and elevated cards without punching a hole in the blur.",
      "merge-conflicts",
    ),
    pr(
      "pr-kb-7",
      107211,
      "Announce agent status to VoiceOver",
      "draft",
      opened(8),
      "Status dots are color-only. Each row should expose a status name, and a live region should speak when an agent flips from idle to running mid-session.",
      "checks-failed",
    ),
    pr(
      "pr-kb-8",
      103988,
      "Restore focus after closing a tile",
      "merged",
      openedDays(2),
      "Closing a split pane dumped focus onto the desktop. Focus now moves to the neighboring tile, then to its active tab.",
    ),
  ],
  "p-base-ui": [
    pr(
      "pr-bu-1",
      107890,
      "Port dock and tab menus to Base Menu",
      "draft",
      opened(1),
      "Triggers stay IconButton. Menu surface, items, and separators now use Base Menu primitives.",
      "ready-to-merge",
    ),
    pr(
      "pr-bu-2",
      104321,
      "Migrate workspace tooltips",
      "merged",
      openedDays(3),
      "Workspace hover tooltips use Base Tooltip. Delay and side props map 1:1.",
    ),
    pr(
      "pr-bu-3",
      101098,
      "Swap dialog for Base Dialog",
      "open",
      opened(9),
      "Customize and the composer surface share one Base Dialog. Composer focus restore still needs a pass when the scrim dismisses from a nested popover.",
      "merge-conflicts",
    ),
    pr(
      "pr-bu-4",
      109012,
      "Map Base colors onto glass tokens",
      "draft",
      opened(0.7),
      "Base gray ramp should not leak past our semantic tokens. Theme maps to --bg-*, --text-*, and --border-* only.",
      "checks-failed",
    ),
    pr(
      "pr-bu-5",
      102876,
      "Port icon button to Base Button",
      "merged",
      openedDays(5),
      "Mapped 2xs through lg onto Base Button. xl stays local for the dock tiles.",
    ),
    pr(
      "pr-bu-6",
      108441,
      "Replace popover with Base Popover",
      "open",
      opened(5),
      "Project agents menu uses Base Popover. Anchor and collision match the old menu. Search field stays ours.",
      "checks-running",
    ),
    pr(
      "pr-bu-7",
      100554,
      "Port select to Base Select",
      "closed",
      openedDays(9),
      "Debug bar mode pickers tried Base Select. Keyboard highlight drifted, so this port is on hold.",
    ),
    pr(
      "pr-bu-8",
      106102,
      "Wire Base scroll area to the sidebar",
      "merged",
      openedDays(4),
      "Scroll viewport wraps the agent list. Sticky footer stays outside the scroll clip.",
    ),
    pr(
      "pr-bu-9",
      103677,
      "Port checkbox to Base Checkbox",
      "draft",
      opened(4),
      "Settings rows that are really checkboxes now use Base Checkbox. Checked, mixed, and disabled map. The glass check glyph still draws ours so the mark matches the rest of the chrome.",
      "checks-running",
    ),
    pr(
      "pr-bu-10",
      107334,
      "Replace radio group with Base Radio",
      "open",
      opened(11),
      "Wallpaper picker is a Base Radio group. Preview tiles stay our layout.",
      "ready-to-merge",
    ),
    pr(
      "pr-bu-11",
      101765,
      "Switch theme toggle to Base Switch",
      "merged",
      openedDays(6),
      "Appearance light/dark is a Base Switch. The label sits outside so the hit area matches the old pair of buttons.",
    ),
    pr(
      "pr-bu-12",
      109443,
      "Collapsible for project folders",
      "open",
      opened(16),
      "Project folder open state uses Base Collapsible. Height animate is still ours, and the open flag still lives in the per-window sidebar store so drag-and-drop collapse does not fight the primitive.",
      "merge-conflicts",
    ),
    pr(
      "pr-bu-13",
      104990,
      "Context menu to Base Context Menu",
      "draft",
      opened(22),
      "Sidebar and tab right-click menus share Base Context Menu. Submenus still clip at the window edge on short tiles.",
      "checks-failed",
    ),
    pr(
      "pr-bu-14",
      108208,
      "Combobox for the workspace switcher",
      "open",
      opened(7),
      "Footer workspace switcher filters as you type through Base Combobox. Empty state and the create row stay ours.",
      "checks-running",
    ),
    pr(
      "pr-bu-15",
      102019,
      "Toast stack to Base Toast",
      "merged",
      openedDays(7),
      "Copy and screenshot toasts share Base Toast. Stack rises from the bottom.",
    ),
    pr(
      "pr-bu-16",
      106788,
      "Accordion for settings sections",
      "closed",
      openedDays(11),
      "Tried Base Accordion for appearance sections. Exclusive open fought the debug chips, so we closed this and kept the static stack.",
    ),
    pr(
      "pr-bu-17",
      103210,
      "Toggle group for segmented controls",
      "open",
      opened(20),
      "Agents/PRs and the debug chips should share one segmented primitive. Base Toggle Group handles the radios; the track chrome is still our pill so the two surfaces stay visually identical.",
      "checks-failed",
    ),
    pr(
      "pr-bu-18",
      107001,
      "Form fields in the new project dialog",
      "draft",
      opened(13),
      "Name uses Base Field + Input. Icon and color stay a custom grid because the picker is not a native select.",
      "ready-to-merge",
    ),
    pr(
      "pr-bu-19",
      100812,
      "Alert dialog for delete project",
      "merged",
      openedDays(1),
      "Deleting a project confirms through Base Alert Dialog. The scrim traps focus on confirm and cancel.",
    ),
    pr(
      "pr-bu-20",
      105667,
      "Input and textarea for the composer",
      "closed",
      openedDays(12),
      "Tried to put Base Input under the composer doc. Single-line chips worked; the contenteditable surface did not, so this stays closed until we split the chip row from the doc.",
    ),
  ],
};

export const pullRequestsFor = (projectId: string): PullRequest[] =>
  PULL_REQUESTS_BY_PROJECT[projectId] ?? [];
