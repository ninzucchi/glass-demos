// Initial demo state. Workspaces/agents are shared across windows; within a
// window, switching between agents in the same workspace AND on the same branch
// keeps the Content panel, switching across workspaces, across branches, or to
// the standalone agent swaps it.

import type { Agent, AgentStatus, ChatMessage, ContentScopeState, Workspace } from "@/types";
import { MAIN_WINDOW_ID, type WorkspaceData } from "@/store/useWorkspaceStore";
import { ensurePinnedTabs, makeSplit, makeTab, makeTile } from "@/store/layoutTree";

// Terse message builders so the simulated conversations stay readable inline.
const u = (text: string): ChatMessage => ({ role: "user", text });
const a = (text: string, tool?: string): ChatMessage => ({ role: "agent", text, tool });

// `updatedAt` timestamps are relative to load time so a fresh seed always
// buckets correctly in the recency sidebar (see `groupAgentsByRecency`).
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
): Agent {
  return {
    id,
    workspaceId,
    branch,
    title,
    status,
    updatedAt,
    messages,
  };
}

export function createSeed(): WorkspaceData {
  const workspaces: Record<string, Workspace> = {
    "acme-marketing": { id: "acme-marketing", name: "acme-marketing" },
    "acme-microsite": { id: "acme-microsite", name: "acme-microsite" },
    "acme-ios": { id: "acme-ios", name: "acme-ios" },
    "acme-desktop": { id: "acme-desktop", name: "acme-desktop" },
    "figma-plugin": { id: "figma-plugin", name: "figma-plugin" },
  };
  const workspaceOrder = [
    "acme-marketing",
    "acme-microsite",
    "acme-ios",
    "acme-desktop",
    "figma-plugin",
  ];

  // Per workspace, agents are spread across the recency buckets (Today /
  // Yesterday / Last 7 Days / Older) so the single-workspace sidebar view has
  // something to group. `updatedAt` is the only driver of that grouping.
  const agentsList: Agent[] = [
    // a-mkt-1 sits alone on "main", so it keeps a separate Content panel from
    // its same-workspace siblings (a-mkt-2/3 share "ettore/new-landing-page").
    agent("a-mkt-1", "acme-marketing", "main", "Add blog index pagination", "running", daysAgo(0, 9), [
      u("The blog index loads every post at once."),
      a("Added page-based pagination with 10 per page and prev/next links.", "Worked 18s"),
    ]),
    agent("a-mkt-2", "acme-marketing", "ettore/new-landing-page", "Build the new landing page", "running", daysAgo(0, 14), [
      u("Start the redesigned landing page on a fresh branch."),
      a("Scaffolded the hero with a primary-toned gradient wash and a single CTA.", "Worked 21s"),
    ]),
    agent("a-mkt-3", "acme-marketing", "ettore/new-landing-page", "Tune the hero gradient", "attention", daysAgo(1, 16), [
      u("The new hero wash feels a touch heavy up top."),
      a("Switched the top stop to the primary surface, but want a design call on the fade.", "Worked 9s"),
    ]),
    agent("a-mkt-4", "acme-marketing", "main", "Fix nav dropdown focus trap", "idle", daysAgo(3), [
      u("Keyboard focus escapes the nav dropdown."),
      a("Trapped focus within the menu and restored it to the trigger on close.", "Worked 11s"),
    ]),
    agent("a-mkt-5", "acme-marketing", "main", "Migrate marketing site to Tailwind v4", "idle", daysAgo(12), [
      u("Bump the marketing site to Tailwind v4."),
      a("Upgraded the config and replaced removed utilities; build is green.", "Worked 34s"),
    ]),

    agent("a-ms-1", "acme-microsite", "main", "Acme Air launch microsite", "running", daysAgo(0, 10), [
      u("Set up the single-page layout for the Air launch."),
      a("Scaffolded the hero, feature row, and signup footer in one page.", "Worked 22s"),
    ]),
    agent("a-ms-2", "acme-microsite", "main", "Optimize hero image loading", "idle", daysAgo(1, 11), [
      u("Hero image is huge on mobile."),
      a("Swapped in responsive sources and lazy-loaded below the fold.", "Worked 9s"),
    ]),
    agent("a-ms-3", "acme-microsite", "main", "Add cookie consent banner", "idle", daysAgo(4), [
      u("We need a cookie consent banner before launch."),
      a("Added a dismissible banner that persists the choice locally.", "Worked 14s"),
    ]),

    agent("a-ios-1", "acme-ios", "main", "Composer keyboard avoidance", "running", daysAgo(0, 11), [
      u("The composer hides behind the keyboard on smaller phones."),
      a("Added a keyboard layout guide so the input rises with the keyboard.", "Worked 16s"),
      u("Nice, feels right."),
    ]),
    agent("a-ios-2", "acme-ios", "main", "Session model refactor", "idle", daysAgo(1, 16), [
      u("Can we split Session into value types?"),
      a("Extracted SessionState and moved persistence to a store.", "Worked 27s"),
    ]),
    agent("a-ios-3", "acme-ios", "main", "App Intents integration", "attention", daysAgo(2), [
      u("Wire up App Intents so Siri can start a session."),
      a("Intent is registered, but the entitlement needs your Apple ID.", "Worked 12s"),
    ]),
    agent("a-ios-4", "acme-ios", "main", "Dark mode polish", "idle", daysAgo(20), [
      u("A few views look off in dark mode."),
      a("Audited the asset catalog and fixed the mismatched semantic colors.", "Worked 18s"),
    ]),

    agent("a-desk-1", "acme-desktop", "main", "Tray menu quick actions", "idle", daysAgo(0, 8), [
      u("Add quick actions to the tray menu."),
      a("Added New Window, Toggle Mute, and Quit with shortcuts.", "Worked 8s"),
    ]),
    agent("a-desk-2", "acme-desktop", "main", "IPC bridge for file watcher", "running", daysAgo(1, 10), [
      u("Renderer needs to know when watched files change."),
      a("Set up a typed IPC channel that streams watcher events.", "Worked 19s"),
    ]),
    agent("a-desk-3", "acme-desktop", "main", "Auto-update channel toggle", "idle", daysAgo(5), [
      u("Let users switch between stable and beta updates."),
      a("Added a channel toggle in Settings wired to the updater feed.", "Worked 17s"),
    ]),
    agent("a-desk-4", "acme-desktop", "main", "Crash reporter integration", "idle", daysAgo(15), [
      u("Wire up crash reporting for the desktop build."),
      a("Integrated the reporter and gated uploads behind a consent prompt.", "Worked 23s"),
    ]),

    agent("a-fig-1", "figma-plugin", "main", "Icon export pipeline", "idle", daysAgo(0, 13), [
      u("Export all selected icons as optimized SVGs."),
      a("Batched the export and ran SVGO; 24 icons written.", "Worked 13s"),
    ]),
    agent("a-fig-2", "figma-plugin", "main", "Variable binding for fills", "attention", daysAgo(1, 9), [
      u("Bind the fill color to a Figma variable."),
      a("Bound fills[0] to the variable alias — double-check the mode mapping.", "Worked 10s"),
    ]),

    // Standalone (workspace-less) agent: branch is ignored for its scope.
    agent("a-solo-1", null, "main", "Keyboard behavior after navigation", "idle", daysAgo(2, 15), [
      u("After navigating, focus lands on the wrong element."),
      a("Restored focus to the main heading on route change.", "Worked 7s"),
    ]),
  ];

  const agents: Record<string, Agent> = {};
  for (const ag of agentsList) agents[ag.id] = ag;
  const agentOrder = agentsList.map((ag) => ag.id);

  // Most scopes ("ws:<id>@<branch>" | "agent:<id>") start with a single tile /
  // single tab (acme-desktop seeds a split to show a stacked layout). Distinct
  // tab types per scope make cross-workspace sharing obvious and exercise both
  // browser variants; the user can split via right-click from here. Both
  // acme-marketing branches seed a browser panel,
  // but the mock is branch-aware (new-landing-page uses a primary-toned hero),
  // so switching between same-workspace chats on different branches is visibly
  // distinct.
  const contentByScope: Record<string, ContentScopeState> = {
    "ws:acme-marketing@main": {
      open: true,
      layout: makeTile([makeTab("browser", { title: "localhost:3000" })]),
    },
    "ws:acme-marketing@ettore/new-landing-page": {
      open: true,
      layout: makeTile([makeTab("browser", { title: "localhost:3000" })]),
    },
    "ws:acme-microsite@main": {
      open: true,
      layout: makeTile([makeTab("browser", { title: "localhost:4000" })]),
    },
    "ws:acme-ios@main": {
      open: true,
      layout: makeTile([makeTab("files", { title: "Composer.swift", folder: "Sources/Views" })]),
    },
    // acme-desktop seeds a stacked layout: one open file (sidebar shown) on top
    // with a terminal split into a row beneath it. Content starts closed so
    // first load is chat-only; opening the pane restores this layout.
    "ws:acme-desktop@main": {
      open: false,
      layout: makeSplit(
        "vertical",
        [
          makeTile([makeTab("files", { title: "App.tsx", folder: "src/renderer" })], {
            files: true,
          }),
          makeTile([makeTab("terminal")]),
        ],
        [70, 30],
      ),
    },
    "ws:figma-plugin@main": {
      open: true,
      layout: makeTile([makeTab("review", { title: "PR #318" })]),
    },
    "agent:a-solo-1": {
      open: false,
      layout: makeTile([makeTab("files", { title: "notes.md", folder: "Docs" })]),
    },
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
    // No overrides: every workspace starts on the default pinned set.
    pinnedTabs: {},
    windows: {
      [MAIN_WINDOW_ID]: {
        id: MAIN_WINDOW_ID,
        // Start on "Tray menu quick actions" (acme-desktop); its workspace group
        // is left expanded so the active agent is visible in the sidebar.
        activeAgentId: "a-desk-1",
        sidebarCollapsed: false,
        chatCollapsed: false,
        workspaceScope: null,
        collapsedWorkspaces: {},
        contentByScope,
        // The chat pane's tree starts as a single tab showing the active agent.
        chatLayout: makeTile([
          makeTab("chat", { agentId: "a-desk-1", title: "Tray menu quick actions" }),
        ]),
        geo: null,
      },
    },
    windowOrder: [MAIN_WINDOW_ID],
  };
}
