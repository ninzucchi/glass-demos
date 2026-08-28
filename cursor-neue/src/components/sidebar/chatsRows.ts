import { SEED_PROJECT_IDS } from "@/data/seed";
import {
  isAgentPinned,
  isMainListItem,
  isProject,
  type Agent,
  type Workspace,
} from "@/types";

const SEED_PROJECT_ID_SET = new Set<string>(SEED_PROJECT_IDS);

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

export type MainListOptions = {
  includeProjects?: boolean;
  hideSeedProjects?: boolean;
};

function chatsAgents(
  agents: Record<string, Agent>,
  agentOrder: string[],
  pinnedAgents: string[],
  options: MainListOptions = {},
): Agent[] {
  const includeProjects = options.includeProjects === true;
  const hideSeed = options.hideSeedProjects === true;
  return agentOrder
    .map((id) => agents[id])
    .filter((a): a is Agent => {
      if (!a || isAgentPinned(pinnedAgents, a.id)) return false;
      if (!isMainListItem(a, includeProjects)) return false;
      if (hideSeed && isProject(a) && SEED_PROJECT_ID_SET.has(a.id)) return false;
      return true;
    });
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

/** Recents list, newest first. One flat section — no date buckets. */
export function recentsList(
  agents: Record<string, Agent>,
  agentOrder: string[],
  pinnedAgents: string[],
  options: MainListOptions = {},
): Agent[] {
  return chatsAgents(agents, agentOrder, pinnedAgents, options).sort(
    (a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id),
  );
}
