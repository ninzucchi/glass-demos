// Initial demo state. Workspaces/agents are shared across windows; within a
// window, switching between agents in the same workspace AND on the same branch
// keeps the Content panel; switching across workspaces or branches swaps it.

import type {
  Agent,
  AgentStatus,
  ChatMessage,
  ContentScopeState,
  LayoutNode,
  ProjectColor,
  Workspace,
} from "@/types";
import type { IconName } from "@/icons/iconNames";
import {
  contentScopeId,
  ensureWorkspaceAgents,
  isProject,
  isWorkspace,
  normalizeWorkspaceIds,
} from "@/types";
import { titleCaseName } from "@/lib/titleCase";
import { MAIN_WINDOW_ID, type WorkspaceData } from "@/store/useWorkspaceStore";
import {
  ensurePinnedTabs,
  makeProjectLayout,
  makeSplit,
  makeTab,
  makeTile,
} from "@/store/layoutTree";

/** Seeded content starts closed. The layout is what the island lists and what
 *  the pane shows when the user opens it — `open` is not implied by having tabs. */
const closedScope = (layout: LayoutNode): ContentScopeState => ({ open: false, layout });

// Terse message builders so the simulated conversations stay readable inline.
const u = (text: string): ChatMessage => ({ role: "user", text });
const a = (text: string, tool?: string): ChatMessage => ({ role: "agent", text, tool });

// `updatedAt` is last-turn time. Folder lists and Recents sort by this, not
// by status. Hours still stack so the list reads as attention / unread /
// running / done: attention and unread sit at the top of today, running
// sits just under them, and every idle agent is older than every running one.
const SEED_NOW = Date.now();
const daysAgo = (n: number, hour = 12, minute = 0): number => {
  const d = new Date(SEED_NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
};

function agent(
  id: string,
  workspaceIds: string | readonly string[],
  branch: string,
  title: string,
  status: AgentStatus,
  updatedAt: number,
  messages: ChatMessage[],
  projectId?: string,
): Agent {
  const ids = normalizeWorkspaceIds(workspaceIds);
  return {
    id,
    workspaceIds: ids,
    projectId,
    groupParentId: projectId ?? ids[0],
    branch,
    title: titleCaseName(title),
    status,
    updatedAt,
    messages,
  };
}

function project(
  id: string,
  workspaceIds: string | readonly string[],
  branch: string,
  title: string,
  status: AgentStatus,
  updatedAt: number,
  messages: ChatMessage[],
  icon: IconName,
  color: ProjectColor,
  description: string,
  createdAt: number,
): Agent {
  const seeded = agent(id, workspaceIds, branch, title, status, updatedAt, messages);
  return {
    ...seeded,
    kind: "project",
    groupParentId: null,
    icon,
    color,
    description,
    createdAt,
  };
}

export const SEED_PROJECT_IDS = ["p-sidebar", "p-keyboard", "p-base-ui"] as const;

const SIDEBAR_PROJECT_MESSAGES: ChatMessage[] = [
  a(
    "Ready to get started on the Glass sidebar.\n\nFrom your recent history, it looks like there are a few big areas of work in flight:\n\n1. Integrating “Projects” into the sidebar\n2. Refactoring layout and building durable components\n3. Improving render-time performance\n4. Simplifying filter and sorting mechanisms\n\nShould I pick up one of these, or something else entirely?",
    "Worked 45s",
  ),
  u("Start with Projects in the sidebar. I want folders, pins, and recents in one column — quieter, still easy to scan."),
  a(
    "That’s the brief I’ll hold.\n\nI’ll treat this as one hierarchy: a project is a folder, pin is a list placement only, and recents stay in the same column. I’m spinning up three agents in parallel:\n\n1. Folder hover — rest glyph stays mounted, chevron fades in\n2. Pin projects — pin must not flatten children\n3. Unread badge — it currently clips the title at compact density\n\nCollapse chrome and recents grouping can wait until those three are stable. Want me to start all three now?",
    "Worked 38s",
  ),
  u("Yes. And pin is non-negotiable — children have to stay nested. Don’t make pin a second tree."),
  a(
    "Locked that in. Pin is a sidebar list only. Children stay under the project folder.\n\nFolder Hover is already swapping the glyph. Pin Projects is writing the nest-preserving move. Unread Badge is still measuring the compact clip.\n\nI’ll keep collapse and day-buckets off the board until pin is in review.",
    "Worked 22s",
  ),
  u("Where are we? I need a status before standup."),
  a(
    "Current cut:\n\n1. Folder Hover is done — chevron fades in and rotates on open. PR is merged.\n2. Pin Projects is in review. Children stay nested. Worth a pass on the pin row itself.\n3. Unread Badge is in progress. I’m moving the badge into the trailing slot so the title can truncate instead of colliding with the count.\n\nStill parked: keep the collapse chevron off the badge, and group recents into day buckets.",
    "Worked 19s",
  ),
  u("Unread is the one people will notice. Finish the trailing slot before you touch recents."),
  a(
    "Agreed. Recents stay Up Next.\n\nUnread Badge is now drawing in the trailing slot. Title truncates against that slot, not against a leading count. I’m still seeing the collapse chevron sit on top of the badge on hover — I can park a follow-up for that or pull it forward. Your call.",
    "Worked 31s",
  ),
  u("Park it. Don’t let the chevron cover the badge, but don’t block unread on it. Recents can wait too — day buckets are nice, not this week."),
  a(
    "Parked both under Up Next:\n\n- Keep the collapse chevron off the unread badge\n- Group recents into day buckets\n\nUnread stays in progress. Pin stays in review. I won’t start recents until you say so.",
    "Worked 11s",
  ),
  u("Can you tighten the pin review? Someone asked if pinning should promote children to the top level. That’s a no."),
  a(
    "Course correcting Pin Projects now. I’ll add an explicit note on the PR: pin does not promote children, and it does not fork a second list.\n\nIf review still wants a “flat pin,” I’ll push back and keep the nest. Unread Badge is unaffected.",
    "Worked 16s",
  ),
  u("Good. After pin lands, what’s the next slice — collapse, or are we actually done with the column?"),
  a(
    "The column is close. What’s left is chrome that fights unread:\n\n1. Finish Unread Badge (trailing slot, still in progress)\n2. Then collapse chevron so it never covers the badge\n3. Recents day buckets only if we want a second week\n\nI would not open a performance pass until those two chrome items are quiet. Want me to keep unread as the only active slice?",
    "Worked 14s",
  ),
  u("Yes. One active slice. Ping me when unread is ready for review."),
  a(
    "Will do. Unread Badge stays the only in-progress agent. Pin Projects waits in review. Collapse and recents stay queued.\n\nI’ll ping when the trailing slot is ready to look at.",
    "Worked 8s",
  ),
];

const KEYBOARD_PROJECT_MESSAGES: ChatMessage[] = [
  a(
    "Welcome to your first project! Here’s how it works:\n\n1. Give me a big area of work, and I’ll break it down into small tasks\n2. I’ll create and manage new agents to take on tasks in parallel\n3. I’ll provide status updates and keep everyone aligned as the work proceeds\n\nTell me what you’re working on and we’ll start from there.",
    "Worked 14s",
  ),
  u("One focus model for Glass. Composer, menus, sidebar, and tiles all have to be reachable from the keyboard. VoiceOver can’t keep hitting nameless chrome."),
  a(
    "That’s the project. Success is a complete tab order, visible focus rings, and names on chrome that used to be silent.\n\nI’ll break it into slices you can redirect:\n\n1. Composer accessories in one tab sequence\n2. A skip link into the transcript\n3. Trap focus in dropdowns, restore on close\n4. One tab stop on the tab bar — arrows move, Home and End jump\n\nMenus, rings, and status announcements can follow. Want composer + skip link first?",
    "Worked 27s",
  ),
  u("Yes. And don’t make every tab its own stop. The bar should be one stop."),
  a(
    "Locked. The tab bar is one stop. Left and right move. Home and End jump the ends.\n\nComposer Tabs is lining up context chip, input, and dictate. Skip Link is first in the pane and targets the transcript. I’ll start Tab Walker next so the bar matches what you just said — not after we ship a per-tab trap.",
    "Worked 24s",
  ),
  u("How’s it going? I keep tabbing past dictate."),
  a(
    "That’s the composer bug. Composer Tabs is in progress — dictate was outside the sequence. It should sit after the input now.\n\nAlso done since you asked last:\n\n- Skip link is in. VoiceOver can jump to the transcript.\n- Escape closes a row menu and returns focus to the row that opened it.\n- Focus restore after a split closes goes to the neighboring tile, then its active tab.\n\nStill open: composer sequence, tab bar walker, focus trap on the nav dropdown, and rings that vanish on glass.",
    "Worked 21s",
  ),
  u("Rings disappearing is a ship blocker. Pull that forward. Arrow keys on the sidebar can wait."),
  a(
    "Course correcting. Arrow keys stay Up Next. I’m pulling Focus Rings into review this cycle — luminous outline so they read on glass in both themes.\n\nComposer Tabs and Tab Walker stay in progress. Focus Trap is already in review (menu holds focus, restore on close). I will not start sidebar arrows or menu typeahead until rings are through.",
    "Worked 18s",
  ),
  u("Status announcer? Running and unread are color-only right now."),
  a(
    "True, and VoiceOver never hears them. I’m not starting Status Announcer this week — you asked for rings first.\n\nI’ve queued it under Up Next with typeahead. Each row should expose a status name; the live region still misses mid-run flips, so that agent will need a second pass. I’ll only pick it up after rings land.",
    "Worked 12s",
  ),
  u("Fine. When composer tabs are done, don’t automatically start typeahead. Ask me."),
  a(
    "Understood. No automatic start on Menu Typeahead or Arrow Keys.\n\nActive set stays:\n\n1. Composer Tabs — one sequence, in progress\n2. Tab Walker — one stop on the bar, in progress\n3. Focus Trap — in review\n4. Focus Rings — in review\n\nI’ll ask before I open anything from Up Next.",
    "Worked 9s",
  ),
  u("If tab walker fights the composer sequence, composer wins."),
  a(
    "Composer wins. If the bar’s one-stop model steals focus from the chip → input → dictate path, Tab Walker yields.\n\nI’ll note that on the walker so review doesn’t “fix” composer by making every accessory a stop again.",
    "Worked 11s",
  ),
];

const BASE_UI_PROJECT_MESSAGES: ChatMessage[] = [
  a(
    "Ready to get started on the Base UI migration.\n\nFrom the current codebase, menus, tooltips, and buttons already sit on Base primitives. A few strong starting points are the customize and composer dialogs — they share a Base Dialog but focus restore still slips — mapping the Base gray ramp onto glass tokens so color does not leak, and the wallpaper picker, which is still a custom list instead of a radio group.\n\nShould I pick up one of these, or something else entirely?",
    "Worked 32s",
  ),
  u("Menus and tooltips first. Then tokens. Do not put the composer doc on Base Input — it stays contenteditable."),
  a(
    "Locked. The composer doc stays off Base Input. Single-line chips can use Input; the doc surface does not.\n\nI’m starting:\n\n1. Menu implementer — dock and tab menus on Base Menu\n2. Tokens — Base gray maps onto --bg-*, --text-*, and --border-* only\n3. Holding Dialog until focus restore is honest\n\nTooltip is already on Base. Wallpaper radios and the shared dialog can wait. Confirm if you want checkbox and switch in this wave or the next.",
    "Worked 29s",
  ),
  u("Switch and checkbox this wave. Dialog and wallpaper can wait. Debug chips too — don’t port Select just to pretty the debug bar."),
  a(
    "Course correcting. Port Select is done and we’re leaving it there — no more debug-bar work this cycle.\n\nThis wave:\n\n- Menus (in progress)\n- Checkbox on settings (in progress)\n- Switch for light/dark (done — label stays outside the control)\n- Tokens still queued; I’ll start them after checkbox has a PR\n\nParked: shared Dialog, wallpaper radios, folder Collapsible, context menus, segmented chips, and new-project fields.",
    "Worked 20s",
  ),
  u("Give me a real update. What’s actually in review vs still slipping?"),
  a(
    "Review right now:\n\n- Agents menu on Base Popover — anchor and collision match. Search field is still ours.\n- Workspace switcher on Base Combobox — list filters. Empty and create row stay ours.\n\nIn progress:\n\n- Dock and tab menus\n- Settings checkboxes (mixed and disabled map; the glass check glyph is still ours)\n\nAlready landed: tooltip, IconButton sizes, scroll area, switch, toasts, delete confirm, and the composer-doc decision.\n\nStill slipping: Dialog focus restore. I have not restarted it.",
    "Worked 17s",
  ),
  u("Keep dialog paused. If menu review asks for a submenu that clips the window, don’t “fix” it with a custom overlay."),
  a(
    "No custom overlay. If Base Menu clips at the window edge, we take that as a Base constraint and document it — we don’t reintroduce a floating layer.\n\nSame rule for context menus when we get there. I’ll add that to the menu PR description.",
    "Worked 10s",
  ),
  u("Tokens next after checkbox, not wallpaper. I don’t want Base gray leaking past our semantics."),
  a(
    "Tokens after checkbox. Wallpaper stays Up Next.\n\nThe token agent will wire Base theme to --bg-*, --text-*, and --border-* only. No raw Base gray in product chrome. I’ll start that the moment checkbox is in review — not before, so we don’t have two color passes in flight.",
    "Worked 13s",
  ),
  u("What’s left that would still look custom to a designer?"),
  a(
    "If they click around today, the leftover custom surfaces are:\n\n1. Shared customize/composer dialog (paused — focus restore)\n2. Wallpaper picker (still a list, should be radio)\n3. Project folder collapse (height animate is ours)\n4. Sidebar and tab context menus (not on Base yet)\n5. Agents/PRs segmented chips (still our pill)\n6. New-project name/icon/color fields\n\nEverything else in this project is either on Base or an explicit hold (composer doc, debug Select). I would pick wallpaper radios after tokens, unless you want the dialog unpaused.",
    "Worked 15s",
  ),
  u("Tokens, then wallpaper. Dialog stays paused until I say otherwise. Don’t start segmented chips."),
  a(
    "Plan is tokens → wallpaper radios. Dialog stays paused. Segmented chips stay queued and I won’t start them.\n\nActive set remains Menu Implementer and Port Checkbox. I’ll ask before I open the token agent.",
    "Worked 8s",
  ),
];

export function createSeed(): WorkspaceData {
  const workspaces: Record<string, Workspace> = {
    everysphere: { id: "everysphere", name: "Everysphere" },
    "baby-glass": { id: "baby-glass", name: "baby-glass" },
    "cursor-icons": { id: "cursor-icons", name: "cursor-icons", collapsed: true },
    "cursor-ios": { id: "cursor-ios", name: "cursor-ios", collapsed: true },
    "figma-plugin": { id: "figma-plugin", name: "figma-plugin", collapsed: true },
  };
  const workspaceOrder = [
    "everysphere",
    "baby-glass",
    "cursor-icons",
    "cursor-ios",
    "figma-plugin",
  ];

  const agentsList: Agent[] = [
    project(
      "p-sidebar",
      "everysphere",
      "main",
      "Sidebar Redesign",
      "running",
      daysAgo(0, 16),
      SIDEBAR_PROJECT_MESSAGES,
      "layout-sidebar-left",
      "blue",
      "This project redesigns the Glass sidebar so folders, pins, and recents live in one column. The intent is a quieter hierarchy that is still easy to scan. Success is stable collapse and pin, and unread state that never fights the folder chrome.",
      daysAgo(3, 10),
    ),
    project(
      "p-keyboard",
      "cursor-ios",
      "main",
      "Keyboard Accessibility",
      "idle",
      daysAgo(0, 17, 20),
      KEYBOARD_PROJECT_MESSAGES,
      "keyboard",
      "purple",
      "This project makes every Glass surface reachable from the keyboard. The intent is one focus model for the composer, menus, sidebar, and tiles. Success is a complete tab order, visible focus rings, and VoiceOver labels on chrome that used to be nameless.",
      daysAgo(8, 11),
    ),
    project(
      "p-base-ui",
      "everysphere",
      "main",
      "Base UI Migration",
      "running",
      daysAgo(0, 17),
      BASE_UI_PROJECT_MESSAGES,
      "cube",
      "green",
      "This project replaces custom chrome with Base UI primitives, one token at a time. The intent is one shared set of menus, dialogs, and fields. Success is each ported surface on Base tokens, with no leftover custom overlay that drifts from the rest of the app.",
      daysAgo(4, 9),
    ),

    agent("a-sb-1", "everysphere", "main", "Folder hover", "running", daysAgo(0, 14), [
      u("Project rows should swap the icon for a chevron on hover."),
      a("The rest glyph stays mounted; the chevron fades in and rotates on open.", "Worked 16s"),
    ], "p-sidebar"),
    agent("a-sb-2", "everysphere", "main", "Pin projects", "unread", daysAgo(0, 16), [
      u("Pinning a project should keep its children nested."),
      a("Pin is a sidebar list only. Children stay under the project folder.", "Worked 12s"),
    ], "p-sidebar"),
    agent("a-sb-3", "everysphere", "main", "Unread badge", "running", daysAgo(0, 13), [
      u("The unread badge clips the project title at compact density."),
      a("Moved the badge into the trailing slot so the title can truncate.", "Worked 9s"),
    ], "p-sidebar"),
    agent("a-sb-4", "everysphere", "main", "Collapse fixer", "idle", daysAgo(0, 9), [
      u("The chevron overlaps the unread badge on hover."),
      a("Moved the chevron into the header so it no longer clips the unread badge.", "Worked 11s"),
    ], "p-sidebar"),

    agent("a-kb-1", "cursor-ios", "main", "Composer tabs", "running", daysAgo(0, 12, 30), [
      u("Tab jumps past the composer accessories."),
      a("Context chip, input, and dictate now sit in one tab sequence.", "Worked 13s"),
    ], "p-keyboard"),
    agent("a-kb-2", "cursor-ios", "main", "Focus trap", "unread", daysAgo(0, 15), [
      u("Keyboard focus escapes the nav dropdown."),
      a("Trapped focus in the menu and restored it to the trigger on close.", "Worked 11s"),
    ], "p-keyboard"),
    agent("a-kb-3", "cursor-ios", "main", "Skip link", "idle", daysAgo(2), [
      u("Add a skip link so VoiceOver can jump to the chat."),
      a("Skip control is first in the pane and targets the transcript.", "Worked 8s"),
    ], "p-keyboard"),
    agent("a-kb-4", "cursor-ios", "main", "Arrow keys", "attention", daysAgo(0, 17, 20), [
      u("Up and down should move between sidebar rows."),
      a("Arrow keys walk visible rows. Home and End still need wiring.", "Worked 15s"),
    ], "p-keyboard"),
    agent("a-kb-5", "cursor-ios", "main", "Escape menus", "idle", daysAgo(5), [
      u("Escape should close the row menu and return focus."),
      a("Escape dismisses the menu and focuses the row that opened it.", "Worked 7s"),
    ], "p-keyboard"),
    agent("a-kb-6", "cursor-ios", "main", "Tab walker", "running", daysAgo(0, 11), [
      u("Tab should land on the active tab, then arrow between the rest."),
      a("The bar is one tab stop. Left and right move. Home and End jump ends.", "Worked 14s"),
    ], "p-keyboard"),
    agent("a-kb-7", "cursor-ios", "main", "Focus rings", "idle", daysAgo(1, 16), [
      u("Focus rings disappear on glass fills."),
      a("Rings now use a luminous outline so they read on both themes.", "Worked 9s"),
    ], "p-keyboard"),
    agent("a-kb-8", "cursor-ios", "main", "Status announcer", "idle", daysAgo(2, 18), [
      u("Status dots are color-only. VoiceOver never hears running or unread."),
      a("Each row exposes a status name. Live region still misses mid-run flips.", "Worked 16s"),
    ], "p-keyboard"),
    agent("a-kb-9", "cursor-ios", "main", "Focus restore", "idle", daysAgo(4, 10), [
      u("Closing a split pane dumps focus onto the desktop."),
      a("Focus moves to the neighboring tile, then to its active tab.", "Worked 11s"),
    ], "p-keyboard"),
    agent("a-kb-10", "cursor-ios", "main", "Menu typeahead", "idle", daysAgo(6, 14), [
      u("The project agents menu should jump to a row as I type."),
      a("Prefix match scrolls the row into view. Accented letters still miss.", "Worked 13s"),
    ], "p-keyboard"),

    agent("a-bu-1", "everysphere", "main", "Menu implementer", "running", daysAgo(0, 13, 30), [
      u("Port the dock and tab menus to Base Menu."),
      a("Triggers stay IconButton. Menu surface now uses Base Menu primitives.", "Worked 22s"),
    ], "p-base-ui"),
    agent("a-bu-2", "everysphere", "main", "Port tooltip", "unread", daysAgo(0, 15, 30), [
      u("Workspace hover tooltips should use Base Tooltip."),
      a("Delay and side props map 1:1. Content is still our list layout.", "Worked 10s"),
    ], "p-base-ui"),
    agent("a-bu-3", "everysphere", "main", "Swap dialog", "attention", daysAgo(0, 17), [
      u("Customize and composer surface should share one dialog primitive."),
      a("Both open through Base Dialog. Composer focus restore needs a pass.", "Worked 18s"),
    ], "p-base-ui"),
    agent("a-bu-4", "everysphere", "main", "Port buttons", "idle", daysAgo(4), [
      u("IconButton sizes should come from Base Button."),
      a("Mapped 2xs through lg onto Base Button. xl stays local for now.", "Worked 16s"),
    ], "p-base-ui"),
    agent("a-bu-5", "everysphere", "main", "Token expert", "idle", daysAgo(6), [
      u("Base gray ramp should not leak past our semantic tokens."),
      a("Wired Base theme to --bg-*, --text-*, and --border-* only.", "Worked 19s"),
    ], "p-base-ui"),
    agent("a-bu-6", "everysphere", "main", "Port popover", "idle", daysAgo(7), [
      u("Project agents menu should use Base Popover."),
      a("Anchor and collision match the old menu. Search field stays ours.", "Worked 14s"),
    ], "p-base-ui"),
    agent("a-bu-7", "everysphere", "main", "Port select", "idle", daysAgo(8, 11), [
      u("Debug bar segmented controls should share one select primitive."),
      a("Mode pickers now use Base Select. Keyboard highlight still drifts.", "Worked 17s"),
    ], "p-base-ui"),
    agent("a-bu-8", "everysphere", "main", "Scroll area", "idle", daysAgo(9), [
      u("Sidebar overflow should use Base Scroll Area."),
      a("Scroll viewport wraps the list. Sticky footer stays outside it.", "Worked 12s"),
    ], "p-base-ui"),
    agent("a-bu-9", "everysphere", "main", "Port checkbox", "running", daysAgo(0, 10, 30), [
      u("Settings toggles that are really checkboxes should use Base Checkbox."),
      a("Checked, mixed, and disabled map. The glass check glyph still draws ours.", "Worked 15s"),
    ], "p-base-ui"),
    agent("a-bu-10", "everysphere", "main", "Replace radios", "unread", daysAgo(0, 14, 30), [
      u("Wallpaper picker should be a radio group, not a custom list."),
      a("Base Radio owns the roving tabindex. Preview tiles stay our layout.", "Worked 11s"),
    ], "p-base-ui"),
    agent("a-bu-11", "everysphere", "main", "Replace toggles", "idle", daysAgo(3, 17), [
      u("Appearance light/dark should be a switch, not two buttons."),
      a("Base Switch drives the store. Label stays outside so hit area matches.", "Worked 8s"),
    ], "p-base-ui"),
    agent("a-bu-12", "everysphere", "main", "Folder collapse", "idle", daysAgo(2, 9), [
      u("Project folder open state should use Base Collapsible."),
      a("Height animate is ours. Open state still lives in the window store.", "Worked 20s"),
    ], "p-base-ui"),
    agent("a-bu-13", "everysphere", "main", "Context menus", "idle", daysAgo(3, 13), [
      u("Sidebar and tab right-click menus should share Base Context Menu."),
      a("Items and separators ported. Submenus still clip at the window edge.", "Worked 21s"),
    ], "p-base-ui"),
    agent("a-bu-14", "everysphere", "main", "Workspace filter", "idle", daysAgo(1, 17), [
      u("Footer workspace switcher needs filter-as-you-type."),
      a("Base Combobox filters the list. Empty state and create row still ours.", "Worked 18s"),
    ], "p-base-ui"),
    agent("a-bu-15", "everysphere", "main", "Stack toasts", "idle", daysAgo(5, 11), [
      u("Copy and screenshot toasts should use one primitive."),
      a("Base Toast stacks from the bottom. Duration and dismiss match the old ones.", "Worked 10s"),
    ], "p-base-ui"),
    agent("a-bu-16", "everysphere", "main", "Settings accordion", "idle", daysAgo(6, 9), [
      u("Appearance sections should collapse independently."),
      a("Base Accordion owns exclusive open. Section headers keep our type scale.", "Worked 13s"),
    ], "p-base-ui"),
    agent("a-bu-17", "everysphere", "main", "Segmented chips", "idle", daysAgo(7, 15), [
      u("Agents/PRs and debug chips should share one segmented primitive."),
      a("Base Toggle Group handles the radios. Track chrome is still our pill.", "Worked 17s"),
    ], "p-base-ui"),
    agent("a-bu-18", "everysphere", "main", "Project fields", "idle", daysAgo(8, 8), [
      u("Name, icon, and color should be Base Field + Input."),
      a("Labels and errors come from Field. Icon picker stays a custom grid.", "Worked 16s"),
    ], "p-base-ui"),
    agent("a-bu-19", "everysphere", "main", "Delete confirm", "idle", daysAgo(10, 14), [
      u("Deleting a project needs a confirm that traps focus."),
      a("Base Alert Dialog owns the scrim and the confirm/cancel pair.", "Worked 9s"),
    ], "p-base-ui"),
    agent("a-bu-20", "everysphere", "main", "Composer input", "idle", daysAgo(11, 10), [
      u("Composer should use Base Input under the doc, not a raw textarea."),
      a("Single-line chips use Input. The doc surface stays contenteditable.", "Worked 24s"),
    ], "p-base-ui"),

    // a-mkt-1 sits alone on "main", so it keeps a separate Content panel from
    // chats that share a different branch in the same workspace.
    agent("a-mkt-1", "everysphere", "main", "Add blog index pagination", "running", daysAgo(0, 12), [
      u("The blog index loads every post at once."),
      a("Added page-based pagination with 10 per page and prev/next links.", "Worked 18s"),
    ]),
    agent("a-mkt-4", "everysphere", "main", "Fix nav dropdown focus trap", "idle", daysAgo(3), [
      u("Keyboard focus escapes the nav dropdown."),
      a("Trapped focus within the menu and restored it to the trigger on close.", "Worked 11s"),
    ]),
    agent("a-mkt-5", "everysphere", "main", "Migrate Everysphere site to Tailwind v4", "idle", daysAgo(12), [
      u("Bump the Everysphere site to Tailwind v4."),
      a("Upgraded the config and replaced removed utilities; build is green.", "Worked 34s"),
    ]),

    agent("a-ms-1", "baby-glass", "main", "Glass landing page", "running", daysAgo(0, 11, 30), [
      u("Set up the single-page layout for the glass launch."),
      a("Scaffolded the hero, feature row, and signup footer in one page.", "Worked 22s"),
    ]),
    agent("a-ms-2", "baby-glass", "main", "Optimize hero image loading", "idle", daysAgo(1, 11), [
      u("Hero image is huge on mobile."),
      a("Swapped in responsive sources and lazy-loaded below the fold.", "Worked 9s"),
    ]),
    agent("a-ms-3", "baby-glass", "main", "Add cookie consent banner", "idle", daysAgo(4), [
      u("We need a cookie consent banner before launch."),
      a("Added a dismissible banner that persists the choice locally.", "Worked 14s"),
    ]),

    agent("a-icn-1", "cursor-icons", "main", "Add missing sidebar icons", "idle", daysAgo(0, 8, 30), [
      u("The sidebar is missing glyphs for agent, folder, and search. Those three slots still fall back to the empty square, and we're supposed to ship the Glass chrome next week."),
      a(
        "I walked every sidebar slot against the registry. Agent, folder, and search were the only three still pointing at `_temp`.\n\nDrew 16×16 outline versions on the same 1.5px stroke as `pin` and `inbox`, snapped to the pixel grid, and registered the names so `<Icon name=\"agent\" />` type-checks. Folder is the closed tab so it does not fight the hover chevron.",
        "Worked 28s",
      ),
      u("Projects can expand now — we need folder-open too. The closed folder also sits a pixel low next to workspace rows."),
      a(
        "Added `folder-open` as a sibling asset, not a live transform, so the tab and papers do not jump when a row expands.\n\nNudged the closed folder up half a pixel so its baseline matches the workspace glyphs. Both icons use `currentColor` and keep the same viewBox, so the swap is a name change only.",
        "Worked 22s",
      ),
      u("Can you regenerate the TypeScript union? Last time a few SVG filenames drifted and the build only failed in CI."),
      a(
        "Ran `gen-icons`. `IconName` now includes `agent`, `folder`, `folder-open`, and `search`.\n\nThe script sorts the union, so a rename shows up as a delete plus an add in review instead of a silent drift. I also pointed the sidebar header and project rows at the new names and deleted the `_temp` fallbacks from those call sites.",
        "Worked 14s",
      ),
      u("Pin and inbox look heavier than these at 12px in the header. Can we match the weight so the chrome feels like one set?"),
      a(
        "Header slots render at 12px, but the source art is 16. The new icons used a true 1.5px stroke, which went anemic when scaled down.\n\nI bumped the optical stroke to 1.75 at source so they match `pin` and `inbox` at both sizes. Caps are square and joins are miter, same as the rest of the stroke set. At 16px in the row they still read as outlines, not blobs.",
        "Worked 19s",
      ),
      u("Search is reading as a magnifying glass from a different family. The handle is too long and the bowl is too round."),
      a(
        "Shortened the handle and pulled the bowl in to 10px so it sits in the same optical circle as `plus` and `inbox`.\n\nThe glass no longer looks like a marketing icon. I also evened the gap between the bowl and the handle so it does not pick up a hairline at 12px on non-retina.",
        "Worked 11s",
      ),
      u("Add aria-labels on the header icon buttons while you're in there. Search, New Agent, Inbox, and Customize are still nameless to VoiceOver."),
      a(
        "Labeled all four. The glyphs stay decorative (`aria-hidden`) and the button carries the name.\n\nSearch, New Agent, Inbox, and Customize now announce correctly. I left the row-level folder icons unlabeled because the project title is already the accessible name.",
        "Worked 9s",
      ),
      u("Anything still using the placeholder? I want this chat to be the one we review from."),
      a(
        "Sidebar chrome is covered. Agent, folder, folder-open, and search are in the registry and wired through the header and project rows.\n\nThe remaining `_temp` hits are the dock screenshot menu and one Figma export preview — out of scope here. Ready for review whenever you are.",
        "Worked 6s",
      ),
    ]),
    agent("a-icn-2", "cursor-icons", "main", "Sync icon names with the registry", "running", daysAgo(0, 10), [
      u("A few SVG filenames drifted from the TypeScript union."),
      a("Renamed the files and regenerated iconNames so the types match.", "Worked 19s"),
    ]),
    agent("a-icn-3", "cursor-icons", "main", "Add filled variants for status icons", "idle", daysAgo(5), [
      u("Running and attention need filled companions."),
      a("Drew the filled pair and exported them next to the outlines.", "Worked 17s"),
    ]),
    agent("a-icn-4", "cursor-icons", "main", "Optimize SVG stroke icons", "idle", daysAgo(8, 10), [
      u("The stroke set is heavier than it needs to be."),
      a("Snapped strokes to the grid and stripped unused groups.", "Worked 23s"),
    ]),

    agent("a-ios-3", "cursor-ios", "main", "App intents integration", "attention", daysAgo(0, 18), [
      u("Wire up App Intents so Siri can start a session."),
      a("Intent is registered, but the entitlement needs your Apple ID.", "Worked 12s"),
    ]),
    agent("a-ios-4", "cursor-ios", "main", "Dark mode polish", "idle", daysAgo(11, 15), [
      u("A few views look off in dark mode."),
      a("Audited the asset catalog and fixed the mismatched semantic colors.", "Worked 18s"),
    ]),

    agent("a-fig-1", "figma-plugin", "main", "Icon export pipeline", "idle", daysAgo(0, 8), [
      u("Export all selected icons as optimized SVGs."),
      a("Batched the export and ran SVGO; 24 icons written.", "Worked 13s"),
    ]),
    agent("a-fig-2", "figma-plugin", "main", "Variable binding for fills", "attention", daysAgo(0, 16, 30), [
      u("Bind the fill color to a Figma variable."),
      a("Bound fills[0] to the variable alias — double-check the mode mapping.", "Worked 10s"),
    ]),
  ];

  const agents: Record<string, Agent> = ensureWorkspaceAgents(
    workspaces,
    Object.fromEntries(agentsList.map((ag) => [ag.id, ag])),
  );
  const agentOrder = agentsList.map((ag) => ag.id);

  // Most scopes ("ws:<id>@<branch>") start with a single tile / single tab
  // (cursor-icons seeds a split to show a stacked layout). Distinct
  // tab types per scope make cross-workspace sharing obvious and exercise both
  // browser variants; the user can split via right-click from here. Both
  // everysphere branches seed a browser panel,
  // but the mock is branch-aware (new-landing-page uses a primary-toned hero),
  // so switching between same-workspace chats on different branches is visibly
  // distinct.
  const contentByScope: Record<string, ContentScopeState> = {
    "ws:everysphere@main": closedScope(
      makeTile([makeTab("browser", { title: "localhost:3000" })]),
    ),
    "ws:everysphere@ettore/new-landing-page": closedScope(
      makeTile([makeTab("browser", { title: "localhost:3000" })]),
    ),
    "ws:baby-glass@main": closedScope(
      makeTile([makeTab("browser", { title: "localhost:4000" })]),
    ),
    "ws:cursor-ios@main": closedScope(
      makeTile([makeTab("files", { title: "Composer.swift", folder: "Sources/Views" })]),
    ),
    // Stacked file + terminal; opening the pane restores this layout.
    "ws:cursor-icons@main": closedScope(
      makeSplit(
        "vertical",
        [
          makeTile([makeTab("files", { title: "registry.ts", folder: "src" })], {
            files: true,
          }),
          makeTile([makeTab("terminal")]),
        ],
        [70, 30],
      ),
    ),
    "ws:figma-plugin@main": closedScope(makeTile([makeTab("review", { title: "PR #318" })])),
  };
  // Materialize each workspace's (default) pinned set as real leading tabs, so
  // the seed obeys the same invariant the store enforces on every write.
  for (const [sid, scope] of Object.entries(contentByScope)) {
    scope.layout = ensurePinnedTabs({}, sid, scope.layout);
  }
  // Each project / workspace owner owns a private scope with one Tracker tab.
  // Both start open so selecting the folder shows the board immediately.
  for (const ag of Object.values(agents)) {
    if (!isProject(ag) && !isWorkspace(ag)) continue;
    contentByScope[contentScopeId(ag)] = {
      layout: makeProjectLayout(),
      open: true,
      cleared: false,
    };
  }

  const chatLayout = makeTile([
    makeTab("chat", { agentId: "a-icn-1", title: "Add missing sidebar icons" }),
  ]);

  return {
    workspaces,
    workspaceOrder,
    agents,
    agentOrder,
    projectOrder: ["p-sidebar", "p-keyboard", "p-base-ui"],
    groupFolderOrder: [
      "p-sidebar",
      "p-keyboard",
      "p-base-ui",
      ...workspaceOrder,
    ],
    // Same agent records as Chats — pin is a sidebar list, not a new kind.
    pinnedAgents: ["a-icn-1", "a-ios-3"],
    // No overrides: every workspace starts on the default pinned set.
    pinnedTabs: {},
    windows: {
      [MAIN_WINDOW_ID]: {
        id: MAIN_WINDOW_ID,
        // Start on "Add missing sidebar icons" (cursor-icons); its workspace
        // group is left expanded so the active agent is visible in the sidebar.
        activeAgentId: "a-icn-1",
        sidebarCollapsed: false,
        chatCollapsed: false,
        collapsedSidebar: {},
        agentGroupBy: "workspace",
        contentByScope,
        // The chat pane's tree starts as a single tab showing the active agent.
        chatLayout,
        chatByOwner: { "a-icn-1": chatLayout },
        geo: null,
      },
    },
    windowOrder: [MAIN_WINDOW_ID],
  };
}
