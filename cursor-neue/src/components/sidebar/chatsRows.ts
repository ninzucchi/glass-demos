import {
  isAgentPinned,
  isChatsAgent,
  isProject,
  projectRecency,
  projectsInWorkspace,
  type Agent,
  type AgentGroupBy,
  type Workspace,
} from "@/types";

/** One row in the Workspaces / Recents list. Built before render so grouping
 *  and the Flat treatment share one padded-last-child rule. */
export type ChatsRow =
  | { kind: "workspace"; id: string; workspace: Workspace; padded: boolean }
  | { kind: "project"; id: string; project: Agent; padded: boolean }
  | { kind: "agent"; id: string; agent: Agent };

export interface ChatsRowsInput {
  groupBy: AgentGroupBy;
  flat: boolean;
  workspaceOrder: string[];
  workspaces: Record<string, Workspace>;
  agents: Record<string, Agent>;
  agentOrder: string[];
  projectOrder: string[];
  pinnedAgents: string[];
}

function chatsAgents(input: ChatsRowsInput): Agent[] {
  return input.agentOrder
    .map((id) => input.agents[id])
    .filter(
      (a): a is Agent =>
        !!a && isChatsAgent(a) && !isAgentPinned(input.pinnedAgents, a.id),
    );
}

function listedProjects(input: ChatsRowsInput): Agent[] {
  return input.projectOrder
    .map((id) => input.agents[id])
    .filter((a): a is Agent => !!a && isProject(a));
}

function byUpdated(agents: Agent[]): Agent[] {
  return [...agents].sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}

/** Folders that are not the last row keep 8px of open-body padding. */
function withLastUnpadded(rows: ChatsRow[]): ChatsRow[] {
  const last = rows.length - 1;
  return rows.map((row, i) => {
    if (row.kind === "agent") return row;
    return { ...row, padded: i < last };
  });
}

export function chatsRows(input: ChatsRowsInput): ChatsRow[] {
  switch (input.groupBy) {
    case "workspace": {
      const rows: ChatsRow[] = [];
      for (const id of input.workspaceOrder) {
        const workspace = input.workspaces[id];
        if (!workspace) continue;
        rows.push({ kind: "workspace", id, workspace, padded: true });
        if (input.flat) {
          for (const project of projectsInWorkspace(input.agents, input.projectOrder, id)) {
            rows.push({ kind: "project", id: project.id, project, padded: true });
          }
        }
      }
      return withLastUnpadded(rows);
    }
    case "updated": {
      const chats = byUpdated(chatsAgents(input));
      if (!input.flat) {
        return chats.map((agent) => ({ kind: "agent", id: agent.id, agent }));
      }
      const rows: ChatsRow[] = [
        ...chats.map((agent) => ({ kind: "agent" as const, id: agent.id, agent })),
        ...listedProjects(input).map((project) => ({
          kind: "project" as const,
          id: project.id,
          project,
          padded: true,
        })),
      ];
      rows.sort((a, b) => {
        const atA = a.kind === "project" ? projectRecency(a.project, input.agents, input.agentOrder) : a.agent.updatedAt;
        const atB = b.kind === "project" ? projectRecency(b.project, input.agents, input.agentOrder) : b.agent.updatedAt;
        return atB - atA || a.id.localeCompare(b.id);
      });
      return withLastUnpadded(rows);
    }
    default: {
      const _exhaustive: never = input.groupBy;
      return _exhaustive;
    }
  }
}
