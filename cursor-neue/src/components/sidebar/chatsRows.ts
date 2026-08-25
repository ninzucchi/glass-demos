import {
  isAgentPinned,
  isChatsAgent,
  type Agent,
  type Workspace,
} from "@/types";

/** One row in the Workspaces list. Built before render so grouping shares
 *  one padded-last-child rule. */
export type ChatsRow = {
  kind: "workspace";
  id: string;
  workspace: Workspace;
  padded: boolean;
};

export interface WorkspaceRowsInput {
  workspaceOrder: string[];
  workspaces: Record<string, Workspace>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const RECENTS_BUCKETS = ["today", "yesterday", "week", "older"] as const;
export type RecentsBucketId = (typeof RECENTS_BUCKETS)[number];

export const RECENTS_BUCKET_LABEL: Record<RecentsBucketId, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "Last 7 Days",
  older: "Older",
};

export const recentsSectionId = (id: RecentsBucketId): string => `sec:recents:${id}`;

export type RecentsBucket = { id: RecentsBucketId; agents: Agent[] };

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function recentsBucketId(updatedAt: number, now: number): RecentsBucketId {
  const today = startOfLocalDay(now);
  if (updatedAt >= today) return "today";
  if (updatedAt >= today - DAY_MS) return "yesterday";
  if (updatedAt >= today - 7 * DAY_MS) return "week";
  return "older";
}

function chatsAgents(
  agents: Record<string, Agent>,
  agentOrder: string[],
  pinnedAgents: string[],
): Agent[] {
  return agentOrder
    .map((id) => agents[id])
    .filter(
      (a): a is Agent =>
        !!a && isChatsAgent(a) && !isAgentPinned(pinnedAgents, a.id),
    );
}

/** Folders that are not the last row keep 8px of open-body padding. */
function withLastUnpadded(rows: ChatsRow[]): ChatsRow[] {
  const last = rows.length - 1;
  return rows.map((row, i) => ({ ...row, padded: i < last }));
}

export function chatsRows(input: WorkspaceRowsInput): ChatsRow[] {
  const rows: ChatsRow[] = [];
  for (const id of input.workspaceOrder) {
    const workspace = input.workspaces[id];
    if (!workspace) continue;
    rows.push({ kind: "workspace", id, workspace, padded: true });
  }
  return withLastUnpadded(rows);
}

/** Recents list, newest first, split by local calendar day. Empty buckets
 *  are omitted. Agents older than a week land in Older. */
export function recentsBuckets(
  agents: Record<string, Agent>,
  agentOrder: string[],
  pinnedAgents: string[],
  now = Date.now(),
): RecentsBucket[] {
  const lists: Record<RecentsBucketId, Agent[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };
  const chats = chatsAgents(agents, agentOrder, pinnedAgents).sort(
    (a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id),
  );
  for (const agent of chats) {
    lists[recentsBucketId(agent.updatedAt, now)].push(agent);
  }
  return RECENTS_BUCKETS.map((id) => ({ id, agents: lists[id] })).filter(
    (bucket) => bucket.agents.length > 0,
  );
}
