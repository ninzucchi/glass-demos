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
import { contentScopeId, isProject, normalizeWorkspaceIds } from "@/types";
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

// `updatedAt` is last-message time, relative to load. Every seed time falls
// inside the last two weeks so the Updated grouping reads as a live list.
const SEED_NOW = Date.now();
const daysAgo = (n: number, hour = 12): number => {
  const d = new Date(SEED_NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
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
  return {
    id,
    workspaceIds: normalizeWorkspaceIds(workspaceIds),
    projectId,
    branch,
    title,
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
): Agent {
  return {
    ...agent(id, workspaceIds, branch, title, status, updatedAt, messages),
    kind: "project",
    icon,
    color,
    description,
  };
}

export function createSeed(): WorkspaceData {
  const workspaces: Record<string, Workspace> = {
    everysphere: { id: "everysphere", name: "anysphere" },
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
      "Sidebar redesign",
      "running",
      daysAgo(0, 15),
      [
        u("Keep the Glass sidebar work in one project."),
        a("Scoped folders, pins, recents, and the footer to this chat.", "Worked 6s"),
      ],
      "layout-sidebar-left",
      "blue",
      "Redesigning the Glass sidebar — folders, pins, and recents in one column.",
    ),
    project(
      "p-keyboard",
      "cursor-ios",
      "main",
      "Keyboard accessibility",
      "idle",
      daysAgo(0, 12),
      [
        u("Every Glass surface should be reachable from the keyboard."),
        a("Tracking focus order, shortcuts, and VoiceOver labels here.", "Worked 4s"),
      ],
      "keyboard",
      "purple",
      "Making every Glass surface reachable from the keyboard.",
    ),
    project(
      "p-base-ui",
      "everysphere",
      "main",
      "Base UI migration",
      "running",
      daysAgo(0, 14),
      [
        u("Swap our custom chrome for Base UI, one primitive at a time."),
        a("Menu, tooltip, dialog, and button are the first four ports.", "Worked 7s"),
      ],
      "cube",
      "green",
      "Replacing custom chrome with Base UI primitives, token by token.",
    ),

    agent("a-sb-1", "everysphere", "main", "Folder hover", "running", daysAgo(0, 14), [
      u("Project rows should swap the icon for a chevron on hover."),
      a("The rest glyph stays mounted; the chevron fades in and rotates on open.", "Worked 16s"),
    ], "p-sidebar"),
    agent("a-sb-2", "everysphere", "main", "Pin projects", "unread", daysAgo(0, 11), [
      u("Pinning a project should keep its children nested."),
      a("Pin is a sidebar list only. Children stay under the project folder.", "Worked 12s"),
    ], "p-sidebar"),
    agent("a-sb-3", "everysphere", "main", "Unread badge", "attention", daysAgo(0, 10), [
      u("The unread badge clips the project title at compact density."),
      a("Moved the badge into the trailing slot so the title can truncate.", "Worked 9s"),
    ], "p-sidebar"),
    agent("a-sb-4", "everysphere", "main", "Collapse Fixer", "idle", daysAgo(0, 8), [
      u("The chevron overlaps the unread badge on hover."),
      a("Moved the chevron into the header so it no longer clips the unread badge.", "Worked 11s"),
    ], "p-sidebar"),

    agent("a-kb-1", "cursor-ios", "main", "Composer tabs", "running", daysAgo(0, 11), [
      u("Tab jumps past the composer accessories."),
      a("Context chip, input, and dictate now sit in one tab sequence.", "Worked 13s"),
    ], "p-keyboard"),
    agent("a-kb-2", "cursor-ios", "main", "Focus trap", "unread", daysAgo(1, 9), [
      u("Keyboard focus escapes the nav dropdown."),
      a("Trapped focus in the menu and restored it to the trigger on close.", "Worked 11s"),
    ], "p-keyboard"),
    agent("a-kb-3", "cursor-ios", "main", "Skip link", "idle", daysAgo(2), [
      u("Add a skip link so VoiceOver can jump to the chat."),
      a("Skip control is first in the pane and targets the transcript.", "Worked 8s"),
    ], "p-keyboard"),
    agent("a-kb-4", "cursor-ios", "main", "Arrow keys", "attention", daysAgo(3), [
      u("Up and down should move between sidebar rows."),
      a("Arrow keys walk visible rows. Home and End still need wiring.", "Worked 15s"),
    ], "p-keyboard"),
    agent("a-kb-5", "cursor-ios", "main", "Escape menus", "idle", daysAgo(5), [
      u("Escape should close the row menu and return focus."),
      a("Escape dismisses the menu and focuses the row that opened it.", "Worked 7s"),
    ], "p-keyboard"),
    agent("a-kb-6", "cursor-ios", "main", "Tab Walker", "running", daysAgo(0, 7), [
      u("Tab should land on the active tab, then arrow between the rest."),
      a("The bar is one tab stop. Left and right move. Home and End jump ends.", "Worked 14s"),
    ], "p-keyboard"),
    agent("a-kb-7", "cursor-ios", "main", "Focus rings", "unread", daysAgo(1, 16), [
      u("Focus rings disappear on glass fills."),
      a("Rings now use a luminous outline so they read on both themes.", "Worked 9s"),
    ], "p-keyboard"),
    agent("a-kb-8", "cursor-ios", "main", "Status Announcer", "attention", daysAgo(2, 18), [
      u("Status dots are color-only. VoiceOver never hears running or unread."),
      a("Each row exposes a status name. Live region still misses mid-run flips.", "Worked 16s"),
    ], "p-keyboard"),
    agent("a-kb-9", "cursor-ios", "main", "Focus restore", "idle", daysAgo(4, 10), [
      u("Closing a split pane dumps focus onto the desktop."),
      a("Focus moves to the neighboring tile, then to its active tab.", "Worked 11s"),
    ], "p-keyboard"),
    agent("a-kb-10", "cursor-ios", "main", "Menu typeahead", "unread", daysAgo(6, 14), [
      u("The project agents menu should jump to a row as I type."),
      a("Prefix match scrolls the row into view. Accented letters still miss.", "Worked 13s"),
    ], "p-keyboard"),

    agent("a-bu-1", "everysphere", "main", "Menu Implementer", "running", daysAgo(0, 13), [
      u("Port the dock and tab menus to Base Menu."),
      a("Triggers stay IconButton. Menu surface now uses Base Menu primitives.", "Worked 22s"),
    ], "p-base-ui"),
    agent("a-bu-2", "everysphere", "main", "Port tooltip", "unread", daysAgo(1, 12), [
      u("Workspace hover tooltips should use Base Tooltip."),
      a("Delay and side props map 1:1. Content is still our list layout.", "Worked 10s"),
    ], "p-base-ui"),
    agent("a-bu-3", "everysphere", "main", "Swap dialog", "attention", daysAgo(2, 15), [
      u("Customize and composer surface should share one dialog primitive."),
      a("Both open through Base Dialog. Composer focus restore needs a pass.", "Worked 18s"),
    ], "p-base-ui"),
    agent("a-bu-4", "everysphere", "main", "Port buttons", "idle", daysAgo(4), [
      u("IconButton sizes should come from Base Button."),
      a("Mapped 2xs through lg onto Base Button. xl stays local for now.", "Worked 16s"),
    ], "p-base-ui"),
    agent("a-bu-5", "everysphere", "main", "Token Expert", "unread", daysAgo(6), [
      u("Base gray ramp should not leak past our semantic tokens."),
      a("Wired Base theme to --bg-*, --text-*, and --border-* only.", "Worked 19s"),
    ], "p-base-ui"),
    agent("a-bu-6", "everysphere", "main", "Port popover", "idle", daysAgo(7), [
      u("Project agents menu should use Base Popover."),
      a("Anchor and collision match the old menu. Search field stays ours.", "Worked 14s"),
    ], "p-base-ui"),
    agent("a-bu-7", "everysphere", "main", "Port select", "attention", daysAgo(8, 11), [
      u("Debug bar segmented controls should share one select primitive."),
      a("Mode pickers now use Base Select. Keyboard highlight still drifts.", "Worked 17s"),
    ], "p-base-ui"),
    agent("a-bu-8", "everysphere", "main", "Scroll area", "idle", daysAgo(9), [
      u("Sidebar overflow should use Base Scroll Area."),
      a("Scroll viewport wraps the list. Sticky footer stays outside it.", "Worked 12s"),
    ], "p-base-ui"),
    agent("a-bu-9", "everysphere", "main", "Port checkbox", "running", daysAgo(0, 6), [
      u("Settings toggles that are really checkboxes should use Base Checkbox."),
      a("Checked, mixed, and disabled map. The glass check glyph still draws ours.", "Worked 15s"),
    ], "p-base-ui"),
    agent("a-bu-10", "everysphere", "main", "Replace radios", "unread", daysAgo(1, 8), [
      u("Wallpaper picker should be a radio group, not a custom list."),
      a("Base Radio owns the roving tabindex. Preview tiles stay our layout.", "Worked 11s"),
    ], "p-base-ui"),
    agent("a-bu-11", "everysphere", "main", "Replace toggles", "idle", daysAgo(3, 17), [
      u("Appearance light/dark should be a switch, not two buttons."),
      a("Base Switch drives the store. Label stays outside so hit area matches.", "Worked 8s"),
    ], "p-base-ui"),
    agent("a-bu-12", "everysphere", "main", "Folder collapse", "attention", daysAgo(2, 9), [
      u("Project folder open state should use Base Collapsible."),
      a("Height animate is ours. Open state still lives in the window store.", "Worked 20s"),
    ], "p-base-ui"),
    agent("a-bu-13", "everysphere", "main", "Context menus", "unread", daysAgo(3, 13), [
      u("Sidebar and tab right-click menus should share Base Context Menu."),
      a("Items and separators ported. Submenus still clip at the window edge.", "Worked 21s"),
    ], "p-base-ui"),
    agent("a-bu-14", "everysphere", "main", "Workspace filter", "running", daysAgo(0, 5), [
      u("Footer workspace switcher needs filter-as-you-type."),
      a("Base Combobox filters the list. Empty state and create row still ours.", "Worked 18s"),
    ], "p-base-ui"),
    agent("a-bu-15", "everysphere", "main", "Stack toasts", "idle", daysAgo(5, 11), [
      u("Copy and screenshot toasts should use one primitive."),
      a("Base Toast stacks from the bottom. Duration and dismiss match the old ones.", "Worked 10s"),
    ], "p-base-ui"),
    agent("a-bu-16", "everysphere", "main", "Settings accordion", "unread", daysAgo(6, 9), [
      u("Appearance sections should collapse independently."),
      a("Base Accordion owns exclusive open. Section headers keep our type scale.", "Worked 13s"),
    ], "p-base-ui"),
    agent("a-bu-17", "everysphere", "main", "Segmented chips", "attention", daysAgo(7, 15), [
      u("Agents/PRs and debug chips should share one segmented primitive."),
      a("Base Toggle Group handles the radios. Track chrome is still our pill.", "Worked 17s"),
    ], "p-base-ui"),
    agent("a-bu-18", "everysphere", "main", "Project fields", "idle", daysAgo(8, 8), [
      u("Name, icon, and color should be Base Field + Input."),
      a("Labels and errors come from Field. Icon picker stays a custom grid.", "Worked 16s"),
    ], "p-base-ui"),
    agent("a-bu-19", "everysphere", "main", "Delete confirm", "unread", daysAgo(10, 14), [
      u("Deleting a project needs a confirm that traps focus."),
      a("Base Alert Dialog owns the scrim and the confirm/cancel pair.", "Worked 9s"),
    ], "p-base-ui"),
    agent("a-bu-20", "everysphere", "main", "Composer input", "idle", daysAgo(11, 10), [
      u("Composer should use Base Input under the doc, not a raw textarea."),
      a("Single-line chips use Input. The doc surface stays contenteditable.", "Worked 24s"),
    ], "p-base-ui"),

    // a-mkt-1 sits alone on "main", so it keeps a separate Content panel from
    // chats that share a different branch in the same workspace.
    agent("a-mkt-1", "everysphere", "main", "Add blog index pagination", "running", daysAgo(0, 9), [
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

    agent("a-ms-1", "baby-glass", "main", "Glass landing page", "running", daysAgo(0, 10), [
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

    agent("a-icn-1", "cursor-icons", "main", "Add missing sidebar icons", "idle", daysAgo(0, 8), [
      u("The sidebar is missing glyphs for agent, folder, and search."),
      a("Added the three outline icons and wired them into the registry.", "Worked 8s"),
    ]),
    agent("a-icn-2", "cursor-icons", "main", "Sync icon names with the registry", "running", daysAgo(1, 10), [
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

    agent("a-ios-3", "cursor-ios", "main", "App Intents integration", "attention", daysAgo(2), [
      u("Wire up App Intents so Siri can start a session."),
      a("Intent is registered, but the entitlement needs your Apple ID.", "Worked 12s"),
    ]),
    agent("a-ios-4", "cursor-ios", "main", "Dark mode polish", "idle", daysAgo(11, 15), [
      u("A few views look off in dark mode."),
      a("Audited the asset catalog and fixed the mismatched semantic colors.", "Worked 18s"),
    ]),

    agent("a-fig-1", "figma-plugin", "main", "Icon export pipeline", "idle", daysAgo(0, 13), [
      u("Export all selected icons as optimized SVGs."),
      a("Batched the export and ran SVGO; 24 icons written.", "Worked 13s"),
    ]),
    agent("a-fig-2", "figma-plugin", "main", "Variable binding for fills", "attention", daysAgo(1, 9), [
      u("Bind the fill color to a Figma variable."),
      a("Bound fills[0] to the variable alias — double-check the mode mapping.", "Worked 10s"),
    ]),
  ];

  const agents: Record<string, Agent> = {};
  for (const ag of agentsList) agents[ag.id] = ag;
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
  // Each project agent owns a private scope with one Project tab, already open.
  for (const ag of agentsList) {
    if (!isProject(ag)) continue;
    contentByScope[contentScopeId(ag)] = {
      layout: makeProjectLayout(),
      open: true,
      cleared: false,
    };
  }

  return {
    workspaces,
    workspaceOrder,
    agents,
    agentOrder,
    projectOrder: ["p-sidebar", "p-keyboard", "p-base-ui"],
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
        chatLayout: makeTile([
          makeTab("chat", { agentId: "a-icn-1", title: "Add missing sidebar icons" }),
        ]),
        geo: null,
      },
    },
    windowOrder: [MAIN_WINDOW_ID],
  };
}
