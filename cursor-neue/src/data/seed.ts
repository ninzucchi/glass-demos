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
import { MAIN_WINDOW_ID, type WorkspaceData } from "@/store/useWorkspaceStore";
import { ensurePinnedTabs, makeSplit, makeTab, makeTile } from "@/store/layoutTree";

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
  workspaceId: string | null,
  branch: string,
  title: string,
  status: AgentStatus,
  updatedAt: number,
  messages: ChatMessage[],
  projectId?: string,
): Agent {
  return {
    id,
    workspaceId,
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
  workspaceId: string | null,
  branch: string,
  title: string,
  status: AgentStatus,
  updatedAt: number,
  messages: ChatMessage[],
  icon: IconName,
  color: ProjectColor,
): Agent {
  return {
    ...agent(id, workspaceId, branch, title, status, updatedAt, messages),
    kind: "project",
    icon,
    color,
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
      "p-landing",
      "everysphere",
      "ettore/new-landing-page",
      "Landing redesign",
      "running",
      daysAgo(0, 15),
      [
        u("Track the landing-page rewrite as one project."),
        a("Scoped the hero, pricing, and launch checklist to this project chat.", "Worked 6s"),
      ],
      "pencil",
      "blue",
    ),
    project(
      "p-ios",
      "cursor-ios",
      "main",
      "Composer & keyboard",
      "idle",
      daysAgo(0, 12),
      [
        u("Keep composer and keyboard work together."),
        a("This project chat is the parent for those two threads.", "Worked 4s"),
      ],
      "smiley-happy",
      "purple",
    ),

    // a-mkt-1 sits alone on "main", so it keeps a separate Content panel from
    // its same-workspace siblings (a-mkt-2/3 share "ettore/new-landing-page").
    agent("a-mkt-1", "everysphere", "main", "Add blog index pagination", "running", daysAgo(0, 9), [
      u("The blog index loads every post at once."),
      a("Added page-based pagination with 10 per page and prev/next links.", "Worked 18s"),
    ]),
    agent("a-mkt-2", "everysphere", "ettore/new-landing-page", "Build the new landing page", "running", daysAgo(0, 14), [
      u("Start the redesigned landing page on a fresh branch."),
      a("Scaffolded the hero with a primary-toned gradient wash and a single CTA.", "Worked 21s"),
    ], "p-landing"),
    agent("a-mkt-3", "everysphere", "ettore/new-landing-page", "Tune the hero gradient", "attention", daysAgo(1, 16), [
      u("The new hero wash feels a touch heavy up top."),
      a("Switched the top stop to the primary surface, but want a design call on the fade.", "Worked 9s"),
    ], "p-landing"),
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

    agent("a-ios-1", "cursor-ios", "main", "Composer keyboard avoidance", "running", daysAgo(0, 11), [
      u("The composer hides behind the keyboard on smaller phones."),
      a("Added a keyboard layout guide so the input rises with the keyboard.", "Worked 16s"),
      u("Nice, feels right."),
    ], "p-ios"),
    agent("a-ios-2", "cursor-ios", "main", "Session model refactor", "idle", daysAgo(1, 16), [
      u("Can we split Session into value types?"),
      a("Extracted SessionState and moved persistence to a store.", "Worked 27s"),
    ], "p-ios"),
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

  return {
    workspaces,
    workspaceOrder,
    agents,
    agentOrder,
    projectOrder: ["p-landing", "p-ios"],
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
