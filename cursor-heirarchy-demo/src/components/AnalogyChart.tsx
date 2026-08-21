import { useState } from "react";
import type { HomeVariant } from "./Sidebar";
import { Icon } from "./ui/Icon";

/** How faithfully a system's concept translates to the proposed layout. */
type Match = "direct" | "partial" | "mismatch";

interface TreeNode {
  term: string;
  /** Concrete instance shown muted after the term, e.g. Root "~". */
  example?: string;
  /** Indent depth within the column's tree; 0 is a root-level node. */
  level: number;
  /** Unset on the Proposed column (it's the reference, not a translation). */
  match?: Match;
  /** Tooltip explaining why the translation is partial or broken. */
  note?: string;
  /** Proposed terms this system node is the analog of. Rows aren't lined up
   *  across columns, so hover-highlighting matches on these instead. */
  analogs?: string[];
}

interface Column {
  system: string;
  nodes: TreeNode[];
}

/** Proposed node. */
const pn = (level: number, term: string, example?: string): TreeNode => ({ level, term, example });

type M = { match: Match; note?: string };
const g = (note?: string): M => ({ match: "direct", note });
const y = (note: string): M => ({ match: "partial", note });
const r = (note: string): M => ({ match: "mismatch", note });

/** Each reference system's containment rules are fixed — only the fidelity
 *  colors change per layout. A trailing "…" marks recursive nesting. */
const slackCol = (workspace: M, channel: M, thread: M, dm: M): Column => ({
  system: "Slack",
  nodes: [
    { term: "Workspace", example: "Acme", level: 0, analogs: ["Space", "Workspace", "Home"], ...workspace },
    { term: "Channel", example: "#proj-mobile", level: 1, analogs: ["Agent", "Group", "Project"], ...channel },
    { term: "Thread", example: "re: standup", level: 2, analogs: ["Thread"], ...thread },
    { term: "DM", example: "@dana", level: 1, analogs: ["Chat"], ...dm },
  ],
});

const fsCol = (root: M, folder: M, folderRec: M, fileNested: M, fileLoose: M): Column => ({
  system: "File system",
  nodes: [
    { term: "Root", example: "~", level: 0, analogs: ["Space", "Workspace", "Home"], ...root },
    { term: "Folder", example: "Documents", level: 1, analogs: ["Agent", "Group", "Project"], ...folder },
    { term: "Folder …", example: "Taxes", level: 2, analogs: ["Agent", "Group", "Project"], ...folderRec },
    { term: "File", example: "resume.pdf", level: 2, analogs: ["Thread", "Chat"], ...fileNested },
    { term: "File", example: "notes.txt", level: 1, analogs: ["Thread", "Chat"], ...fileLoose },
  ],
});

const imCol = (list: M, person: M, reply: M, group: M, business: M): Column => ({
  system: "iMessage",
  nodes: [
    { term: "Chat list", level: 0, analogs: ["Space", "Workspace", "Home"], ...list },
    { term: "Person", example: "Maya", level: 1, analogs: ["Chat", "Agent"], ...person },
    { term: "Reply", example: "“sounds good”", level: 2, analogs: ["Thread"], ...reply },
    { term: "Group", example: "Family", level: 1, analogs: ["Group"], ...group },
    { term: "Business", example: "Delta", level: 1, analogs: ["Agent"], ...business },
  ],
});

const notionCol = (priv: M, block: M, blockRec: M, teamspace: M, tsBlock: M): Column => ({
  system: "Notion",
  nodes: [
    { term: "Private", example: "Home", level: 0, analogs: ["Home", "Space", "Workspace"], ...priv },
    { term: "Block", example: "Roadmap", level: 1, analogs: ["Agent", "Group", "Project", "Chat", "Thread"], ...block },
    { term: "Block …", level: 2, analogs: ["Thread"], ...blockRec },
    { term: "Teamspace", example: "Design", level: 0, analogs: ["Space", "Workspace"], ...teamspace },
    { term: "Block", example: "Sprint notes", level: 1, analogs: ["Chat", "Thread", "Agent", "Group", "Project"], ...tsBlock },
  ],
});

/** The proposed layout's possible hierarchy, flattened depth-first. Siblings
 *  at the same level under one parent show heterogeneous membership (e.g. a
 *  Space holding agents, groups, and loose threads side by side). */
// Examples mirror the actual seed data so the chart reads like the sidebar:
// "Acme Labs" (space), "Scribe" (Home agent), "Authentication" (Acme group),
// and their real chats/threads.
const PROPOSED: Record<HomeVariant, TreeNode[]> = {
  // No agent/group distinction here: every container in a space is an agent.
  distinct: [
    pn(0, "Space", "Acme Labs"),
    pn(1, "Agent", "Authentication"),
    pn(2, "Thread", "Sign in with Apple"),
    pn(1, "Thread", "Fix flaky CI tests"),
    pn(2, "Thread …"),
  ],
  // No space entity: former spaces are just more agents at the top level.
  flat: [
    pn(0, "Chat", "v60 vs French Press"),
    pn(1, "Thread …"),
    pn(0, "Agent", "Scribe"),
    pn(1, "Thread", "Design review notes"),
    pn(2, "Thread …"),
    pn(0, "Agent", "Acme Labs"),
    pn(1, "Chat", "Fix flaky CI tests"),
  ],
  // No agent/group distinction here: every container is an agent.
  sections: [
    pn(0, "Home"),
    pn(1, "Chat", "v60 vs French Press"),
    pn(1, "Agent", "Scribe"),
    pn(2, "Thread", "Design review notes"),
    pn(0, "Space", "Acme Labs"),
    pn(1, "Agent", "Authentication"),
    pn(2, "Thread", "Sign in with Apple"),
    pn(1, "Chat", "Fix flaky CI tests"),
  ],
  // No space entity here either — everything at the top level is an agent.
  "flat-home-agent": [
    pn(0, "Agent", "Home"),
    pn(1, "Chat", "v60 vs French Press"),
    pn(0, "Agent", "Scribe"),
    pn(1, "Thread", "Design review notes"),
    pn(2, "Thread …"),
    pn(0, "Agent", "Acme Labs"),
    pn(1, "Chat", "Fix flaky CI tests"),
  ],
  // Home's chats sit flat at the top; the agent circles chat back.
  "space-agent": [
    pn(0, "Chat", "v60 vs French Press"),
    pn(0, "Agent", "Acme Labs"),
    pn(1, "Group", "Authentication"),
    pn(2, "Thread", "Sign in with Apple"),
    pn(1, "Thread", "Fix flaky CI tests"),
    pn(2, "Thread …"),
  ],
  "space-agent-readonly": [
    pn(0, "Chat", "v60 vs French Press"),
    pn(0, "Agent", "Acme Labs"),
    pn(1, "Group", "Authentication"),
    pn(2, "Thread", "Sign in with Apple"),
    pn(1, "Thread", "Fix flaky CI tests"),
    pn(2, "Thread …"),
  ],
  sq: [pn(0, "Space", "Acme Labs"), pn(1, "Chat", "Fix flaky CI tests")],
  "projects-separate": [
    pn(0, "Project", "Authentication"),
    pn(1, "Thread", "Sign in with Apple"),
    pn(0, "Space", "Acme Labs"),
    pn(1, "Chat", "Fix flaky CI tests"),
  ],
  "all-projects": [
    pn(0, "Space", "Acme Labs"),
    pn(1, "Chat", "Fix flaky CI tests"),
    pn(0, "Project", "Authentication"),
    pn(1, "Thread", "Sign in with Apple"),
  ],
  // This variant's vocabulary calls the top-level containers workspaces
  // (matching its approach label), not spaces.
  "projects-readonly": [
    pn(0, "Workspace", "Acme Labs"),
    pn(1, "Chat", "Fix flaky CI tests"),
    pn(1, "Group", "Authentication"),
    pn(2, "Thread", "Sign in with Apple"),
  ],
};

const SLACK_NO_MAIN_CHAT = y("Holds channels and DMs like a space, but has no main chat of its own");
// Agent-oriented layouts word the same mismatches without a space entity.
const SLACK_NO_MAIN_CHAT_AGENT = y(
  "Holds channels and DMs like an agent circle, but has no main chat of its own",
);
const FS_FOLDER_RECURSION = y("Folders nest inside folders; nothing in this layout nests like that");
const IM_FLAT_LIST = r("iMessage has no containers — the chat list is flat");
const IM_PERSON_THREAD = y("A conversation, but it can't be filed inside anything");
const IM_REPLY = y("Inline replies give exactly one level of nesting");
const IM_GROUP = y("Groups people into a chat, not chats into a container");
const IM_BUSINESS = y("A persistent non-human correspondent, but it can't hold threads");

const NOTION_NO_HOME = y("A personal root section; this layout has no personal area beside spaces");
const NOTION_NO_HOME_AGENT = y(
  "A personal root section; this layout has no personal area beside the agents",
);
const NOTION_BLOCK_DUAL = y("A block is container and content at once — no split between the two");
const NOTION_BLOCK_RECURSION = y("Blocks nest without limit; nesting here stops sooner");
const NOTION_BLOCK_LIKE_THREAD = g("Threads nest inside threads like blocks");

const ANALOGIES: Record<HomeVariant, Column[]> = {
  distinct: [
    { system: "Proposed", nodes: PROPOSED.distinct },
    slackCol(
      SLACK_NO_MAIN_CHAT,
      g(),
      g(),
      y("A direct chat like an agent's, but a DM can't hold threads"),
    ),
    fsCol(g(), g(), y("Folders nest; agents can't hold agents"), g(), g()),
    imCol(IM_FLAT_LIST, IM_PERSON_THREAD, IM_REPLY, IM_GROUP, IM_BUSINESS),
    notionCol(NOTION_NO_HOME, NOTION_BLOCK_DUAL, NOTION_BLOCK_LIKE_THREAD, g(), NOTION_BLOCK_DUAL),
  ],
  flat: [
    { system: "Proposed", nodes: PROPOSED.flat },
    slackCol(SLACK_NO_MAIN_CHAT_AGENT, g(), g(), y("A direct chat, but it can't hold threads")),
    fsCol(g(), g(), y("Folders nest; agents can't hold agents"), g(), g()),
    imCol(IM_FLAT_LIST, IM_PERSON_THREAD, IM_REPLY, IM_GROUP, IM_BUSINESS),
    notionCol(
      NOTION_NO_HOME_AGENT,
      NOTION_BLOCK_DUAL,
      NOTION_BLOCK_LIKE_THREAD,
      g(),
      NOTION_BLOCK_DUAL,
    ),
  ],
  sections: [
    { system: "Proposed", nodes: PROPOSED.sections },
    slackCol(SLACK_NO_MAIN_CHAT, g(), g(), g()),
    fsCol(g(), g(), y("Folders nest; agents can't hold agents"), g(), g()),
    imCol(
      y("≈ Home's personal list, but there's nothing beside it"),
      g(),
      IM_REPLY,
      IM_GROUP,
      IM_BUSINESS,
    ),
    notionCol(
      g("≈ Home — a personal section beside shared teamspaces"),
      NOTION_BLOCK_DUAL,
      NOTION_BLOCK_RECURSION,
      g(),
      NOTION_BLOCK_DUAL,
    ),
  ],
  "flat-home-agent": [
    { system: "Proposed", nodes: PROPOSED["flat-home-agent"] },
    slackCol(SLACK_NO_MAIN_CHAT_AGENT, g(), g(), y("A direct chat, but it can't hold threads")),
    fsCol(g(), g(), y("Folders nest; agents can't hold agents"), g(), g()),
    imCol(IM_FLAT_LIST, IM_PERSON_THREAD, IM_REPLY, IM_GROUP, IM_BUSINESS),
    notionCol(
      g("≈ the Home agent — a personal section beside the shared agents"),
      NOTION_BLOCK_DUAL,
      NOTION_BLOCK_LIKE_THREAD,
      g(),
      NOTION_BLOCK_DUAL,
    ),
  ],
  "space-agent": [
    { system: "Proposed", nodes: PROPOSED["space-agent"] },
    slackCol(
      y("Holds the channels like an agent circle, but you can't chat with a workspace"),
      g("A topic container with its own conversation, like a chat-able group"),
      g(),
      y("A direct chat, but it can't hold threads"),
    ),
    fsCol(
      y("A top-level container like an agent, but inert — it doesn't chat back"),
      y("A folder of files, but you can't chat with a folder"),
      FS_FOLDER_RECURSION,
      g(),
      g(),
    ),
    imCol(IM_FLAT_LIST, IM_PERSON_THREAD, IM_REPLY, IM_GROUP, IM_BUSINESS),
    notionCol(
      NOTION_NO_HOME_AGENT,
      NOTION_BLOCK_DUAL,
      NOTION_BLOCK_LIKE_THREAD,
      y("A shared container like an agent circle, but inert — it doesn't chat back"),
      NOTION_BLOCK_DUAL,
    ),
  ],
  "space-agent-readonly": [
    { system: "Proposed", nodes: PROPOSED["space-agent-readonly"] },
    slackCol(
      y("Holds the channels like an agent circle, but you can't chat with a workspace"),
      y("A topic container, but with no main conversation of its own"),
      g(),
      y("A direct chat, but it can't hold threads"),
    ),
    fsCol(
      y("A top-level container like an agent, but inert — it doesn't chat back"),
      g("Read-only groups are true folders"),
      FS_FOLDER_RECURSION,
      g(),
      g(),
    ),
    imCol(IM_FLAT_LIST, IM_PERSON_THREAD, IM_REPLY, IM_GROUP, IM_BUSINESS),
    notionCol(
      NOTION_NO_HOME_AGENT,
      NOTION_BLOCK_DUAL,
      NOTION_BLOCK_LIKE_THREAD,
      y("A shared container like an agent circle, but inert — it doesn't chat back"),
      NOTION_BLOCK_DUAL,
    ),
  ],
  sq: [
    { system: "Proposed", nodes: PROPOSED.sq },
    slackCol(
      y("Holds conversations like a space folder, but has no main chat"),
      r("Groups dissolve in this layout"),
      y("Chats in folders aren't anchored to a message like threads"),
      g(),
    ),
    // SQ is the file-system layout: folders of files, nothing else.
    fsCol(g(), g(), y("Folders nest; spaces can't hold spaces"), g(), g()),
    imCol(
      IM_FLAT_LIST,
      g(),
      r("No nesting in this layout"),
      r("No groups in this layout"),
      r("No agents in this layout"),
    ),
    notionCol(
      NOTION_NO_HOME,
      NOTION_BLOCK_DUAL,
      r("No nesting in this layout"),
      g(),
      NOTION_BLOCK_DUAL,
    ),
  ],
  "projects-separate": [
    { system: "Proposed", nodes: PROPOSED["projects-separate"] },
    slackCol(
      SLACK_NO_MAIN_CHAT,
      y("Holds threads like a project, but projects hoist into one global list"),
      g(),
      g(),
    ),
    fsCol(
      g(),
      y("A folder of files, but projects hoist out of their tree"),
      y("Folders nest; projects can't hold projects"),
      g(),
      g(),
    ),
    imCol(y("≈ the chats section, but there's nothing beside it"), g(), IM_REPLY, IM_GROUP, r("No agents in this layout")),
    notionCol(NOTION_NO_HOME, NOTION_BLOCK_DUAL, NOTION_BLOCK_RECURSION, g(), NOTION_BLOCK_DUAL),
  ],
  "all-projects": [
    { system: "Proposed", nodes: PROPOSED["all-projects"] },
    slackCol(
      SLACK_NO_MAIN_CHAT,
      y("Holds threads like a project, but hoisted beside its workspace instead of inside it"),
      g(),
      g(),
    ),
    fsCol(
      g(),
      y("A folder of files, but pulled up beside its parent instead of nesting inside it"),
      y("Folders nest; projects can't hold projects"),
      g(),
      g(),
    ),
    imCol(y("≈ the chat list, but there's nothing beside it"), g(), IM_REPLY, IM_GROUP, r("No agents in this layout")),
    notionCol(NOTION_NO_HOME, NOTION_BLOCK_DUAL, NOTION_BLOCK_RECURSION, g(), NOTION_BLOCK_DUAL),
  ],
  "projects-readonly": [
    { system: "Proposed", nodes: PROPOSED["projects-readonly"] },
    slackCol(
      SLACK_NO_MAIN_CHAT,
      y("A topic container, but with no main conversation of its own"),
      g(),
      g(),
    ),
    // Read-only projects are inert folders — the pure file-system model.
    fsCol(g(), g("Read-only projects are true folders"), y("Folders nest; projects can't hold projects"), g(), g()),
    imCol(y("≈ the chat list, but there's nothing beside it"), g(), IM_REPLY, IM_GROUP, r("No agents in this layout")),
    notionCol(NOTION_NO_HOME, NOTION_BLOCK_DUAL, NOTION_BLOCK_RECURSION, g(), NOTION_BLOCK_DUAL),
  ],
};

/** What each layout's organizing idea is, in prose — shown in the chart's
 *  leading Layout column. */
const DESCRIPTIONS: Record<HomeVariant, string> = {
  sq: "Status Quo. Spaces are plain folders of chats, no grouping.",
  "projects-separate":
    "Projects are presented as a separate section. Project roots are not exposed, and Projects must be created from scratch.",
  distinct:
    "Workspaces become more generally framed as “Spaces”. Spaces hold threads and named Agents within them. Group threads moves them into a new Agent.",
  sections:
    "Workspaces become more generally framed as “Spaces”. Spaces hold threads and named Agents within them. Group threads moves them into a new Agent. To reduce a level of nesting for Grokbots and allow easy organization of uncategorized threads, “Home” is presented as a top level sidebar section.",
  "all-projects":
    "Workspaces become “Projects”. New Projects can be created from a selection of Chats and are presented at the same level of hierarchy as root projects.",
  "projects-readonly":
    "Status quo, but chats can be grouped, represented as a folder visual, but groups are not chat-able.",
  "space-agent-readonly":
    "Workspaces become represented as Agents. Threads can be grouped, represented as a folder visual, but groups are not chat-able. Threads can have threads.",
  "space-agent":
    "Workspaces become represented as Agents. Threads can be grouped, represented by a folder visual, groups are chat-able. Threads can have threads.",
  flat: "Workspaces become represented as Agents. Threads can be grouped, represented by a nested Agent, and are chat-able. Threads can have threads. Loose, uncategorized threads exist as siblings to Agent chats.",
  "flat-home-agent":
    "Workspaces become represented as Agents. Threads can be grouped, represented by a nested Agent, and are chat-able. Threads can have threads. Loose, uncategorized threads are nested under a “Home” Agent (can be renamed, but some “starter”/CEO of your Agent stack).",
};

const MATCH_TEXT: Record<Match, string> = {
  direct: "text-success",
  partial: "text-warn",
  mismatch: "text-danger",
};

/** Tallest column across every layout; the chart reserves this many rows so
 *  its height never changes and the window above never reflows. */
const MAX_ROWS = Math.max(
  ...Object.values(ANALOGIES).flatMap((cols) => cols.map((c) => c.nodes.length)),
);
const ROW_H = 24;
const HEADER_H = 32;

/** One indent cell of the tree prefix: the node's own branch ("tee" ├ /
 *  "elbow" └) at its level, and a "pipe" │ continuation (or blank spacer)
 *  for every ancestor that has later siblings. */
type Segment = "tee" | "elbow" | "pipe" | "blank";

function treeSegments(nodes: TreeNode[], i: number): Segment[] {
  const { level } = nodes[i];
  const segments: Segment[] = [];
  for (let d = 1; d <= level; d++) {
    // Does depth d continue below this row (a later node at depth d before
    // anything shallower)?
    let continues = false;
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[j].level < d) break;
      if (nodes[j].level === d) {
        continues = true;
        break;
      }
    }
    if (d === level) segments.push(continues ? "tee" : "elbow");
    else segments.push(continues ? "pipe" : "blank");
  }
  return segments;
}

const SEG_W = 16;
const LINE = "var(--border-primary)";

/** CSS-drawn connector cell. Box-drawing glyphs leave gaps (they only fill
 *  the font's em box, not the 24px row), so verticals are drawn as real
 *  full-height hairlines that meet edge-to-edge across rows. */
function Connector({ segment }: { segment: Segment }) {
  return (
    <span className="relative shrink-0" style={{ width: SEG_W, height: ROW_H }}>
      {segment !== "blank" && (
        <span
          className="absolute"
          style={{
            left: 5,
            top: 0,
            bottom: segment === "elbow" ? "50%" : 0,
            width: 1,
            background: LINE,
          }}
        />
      )}
      {(segment === "tee" || segment === "elbow") && (
        <span
          className="absolute"
          style={{ left: 5, top: "50%", width: 7, height: 1, background: LINE }}
        />
      )}
    </span>
  );
}

/** A proposed node's base concept, with the recursion marker stripped
 *  ("Thread …" → "Thread") so it matches system nodes' analog terms. */
const baseTerm = (term: string) => term.replace(/ …$/, "");

/** Analogy chart under the window: a column per system ("Proposed" first),
 *  each rendered as that system's own possible hierarchy — every allowed
 *  child type under its parent, so heterogeneous membership (a folder
 *  holding folders or files) and recursion ("…") are visible. Columns
 *  aren't row-aligned, so fidelity colors (green direct, yellow partial,
 *  red mismatch) appear only while hovering a Proposed node — its analogs
 *  in each system light up, everything else stays neutral. */
export function AnalogyChart({ variant }: { variant: HomeVariant }) {
  const columns = ANALOGIES[variant];
  // Row index disambiguates Proposed rows sharing a term (two "Chat"s etc.);
  // system columns still match on the term alone.
  const [hovered, setHovered] = useState<{ row: number; term: string } | null>(null);
  // Collapsed to a slim reopen bar; the window row above absorbs the height.
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex h-9 shrink-0 items-center justify-between rounded-window bg-chrome px-4 text-sm text-secondary shadow-sm transition-colors duration-fast hover:text-primary"
      >
        Taxonomy Chart
        <Icon name="chevron-up-small" size="sm" color="inherit" />
      </button>
    );
  }

  const rowStyle = (node: TreeNode, isProposed: boolean, row: number) => {
    if (!hovered) return "text-secondary";
    const active = isProposed
      ? hovered.row === row
      : node.analogs?.includes(hovered.term);
    if (!active) return "text-secondary opacity-40";
    return `font-medium ${isProposed ? "text-primary" : MATCH_TEXT[node.match!]}`;
  };

  return (
    // Own panel below the window; the inner grid reserves MAX_ROWS of height
    // so the panel never resizes (and the window never reflows) on switch.
    <div className="relative shrink-0 rounded-window bg-chrome px-4 py-3 shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        title="Hide chart"
        className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-md text-secondary transition-colors duration-fast hover:bg-quaternary-opaque hover:text-primary"
      >
        <Icon name="chevron-down-small" size="sm" color="inherit" />
      </button>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `minmax(0, 1.3fr) repeat(${columns.length}, minmax(0, 1fr))`,
          height: HEADER_H + MAX_ROWS * ROW_H,
        }}
      >
        {/* Leading prose column describing the active layout. */}
        <div className="flex flex-col">
          <span
            className="flex items-center px-3 text-sm text-secondary"
            style={{ height: HEADER_H }}
          >
            Description
          </span>
          <p className="px-3 pt-2 text-base font-medium leading-relaxed text-primary">
            {DESCRIPTIONS[variant]}
          </p>
        </div>
        {columns.map((column) => {
          const isProposed = column.system === "Proposed";
          return (
            <div key={column.system} className="flex flex-col">
              <span
                className="flex items-center px-3 text-sm text-secondary"
                style={{ height: HEADER_H }}
              >
                {isProposed ? "Proposed Taxonomy" : column.system}
              </span>
              {column.nodes.map((node, i) => (
                <span
                  key={i}
                  title={node.note}
                  style={{ height: ROW_H }}
                  onMouseEnter={
                    isProposed
                      ? () => setHovered({ row: i, term: baseTerm(node.term) })
                      : undefined
                  }
                  onMouseLeave={isProposed ? () => setHovered(null) : undefined}
                  className={`flex items-center pl-3 pr-3 text-base transition duration-fast ${rowStyle(
                    node,
                    isProposed,
                    i,
                  )} ${node.note || isProposed ? "cursor-default" : ""}`}
                >
                  {node.level > 0 &&
                    treeSegments(column.nodes, i).map((segment, d) => (
                      <Connector key={d} segment={segment} />
                    ))}
                  <span className={node.level > 0 ? "shrink-0 pl-1" : "shrink-0"}>
                    {node.term}
                    {node.example && ":"}
                  </span>
                  {node.example && (
                    <span className="min-w-0 truncate pl-1 text-tertiary">
                      {node.example}
                    </span>
                  )}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
