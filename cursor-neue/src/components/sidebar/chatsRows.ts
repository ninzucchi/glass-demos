import {
  isAgentPinned,
  isMainListItem,
  isProject,
  isUnionWorkspaceId,
  resolveProjectFolder,
  type Agent,
  type Workspace,
  unionWorkspaceMemberIds,
  unionWorkspaceName,
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
  agents?: Record<string, Agent>;
  agentOrder?: string[];
  /** Merged: emit one union folder per multi-repo project. */
  includeProjects?: boolean;
}

export type MainListOptions = {
  includeProjects?: boolean;
};

function chatsAgents(
  agents: Record<string, Agent>,
  agentOrder: string[],
  pinnedAgents: string[],
  options: MainListOptions = {},
): Agent[] {
  const includeProjects = options.includeProjects === true;
  return agentOrder
    .map((id) => agents[id])
    .filter((a): a is Agent => {
      if (!a || isAgentPinned(pinnedAgents, a.id)) return false;
      if (!isMainListItem(a, includeProjects)) return false;
      return true;
    });
}

/** Folders that are not the last row keep 8px of open-body padding. */
function withLastUnpadded(rows: ChatsRow[]): ChatsRow[] {
  const last = rows.length - 1;
  return rows.map((row, i) => ({ ...row, padded: i < last }));
}

function collectUnionFolders(input: WorkspaceRowsInput): Workspace[] {
  const agents = input.agents;
  const agentOrder = input.agentOrder;
  if (!input.includeProjects || !agents || !agentOrder) return [];
  const unions = new Map<string, Workspace>();
  for (const id of agentOrder) {
    const agent = agents[id];
    if (!agent || !isProject(agent) || agent.draft) continue;
    const folderId = resolveProjectFolder(id, agents, agentOrder, input.workspaces);
    if (!isUnionWorkspaceId(folderId) || unions.has(folderId)) continue;
    const members = unionWorkspaceMemberIds(folderId);
    unions.set(folderId, {
      id: folderId,
      name: unionWorkspaceName(members, input.workspaces),
    });
  }
  return [...unions.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** Place each union folder after the last member repo in the list. */
function insertUnionFolders(rows: ChatsRow[], unions: Workspace[]): ChatsRow[] {
  const next = rows.slice();
  for (const union of unions) {
    const members = new Set(unionWorkspaceMemberIds(union.id));
    let insertAt = next.length;
    for (let i = 0; i < next.length; i++) {
      if (members.has(next[i].id)) insertAt = i + 1;
    }
    next.splice(insertAt, 0, {
      kind: "workspace",
      id: union.id,
      workspace: union,
      padded: true,
    });
  }
  return next;
}

export function chatsRows(input: WorkspaceRowsInput): ChatsRow[] {
  const rows: ChatsRow[] = [];
  for (const id of input.workspaceOrder) {
    const workspace = input.workspaces[id];
    if (!workspace) continue;
    rows.push({ kind: "workspace", id, workspace, padded: true });
  }
  return withLastUnpadded(insertUnionFolders(rows, collectUnionFolders(input)));
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
