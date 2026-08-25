import {
  isAgentPinned,
  isChatsAgent,
  isProject,
  projectRecency,
  projectsInWorkspace,
  resolveProjectFolder,
  type Agent,
  type AgentGroupBy,
  type Workspace,
} from "@/types";

/** One row in the Workspaces / Recents list. Built before render so grouping
 *  and the Flat treatment share one padded-last-child rule. */
export type ChatsRow =
  | {
      kind: "workspace";
      id: string;
      workspace: Workspace;
      padded: boolean;
      /** FlatNested: projects that belong in this folder. */
      projects?: Agent[];
    }
  | { kind: "project"; id: string; project: Agent; padded: boolean }
  | { kind: "agent"; id: string; agent: Agent };

export interface ChatsRowsInput {
  groupBy: AgentGroupBy;
  flat: boolean;
  /** FlatNested: nest projects inside their workspace (or union) folder. */
  nestProjects?: boolean;
  workspaceOrder: string[];
  workspaces: Record<string, Workspace>;
  agents: Record<string, Agent>;
  agentOrder: string[];
  projectOrder: string[];
  pinnedAgents: string[];
  /** Flat + workspace grouping: interleaved workspace and project ids. */
  flatFolderOrder?: string[];
}

/** Default Flat list: each workspace, then its projects, in `projectOrder`. */
export function defaultFlatFolderOrder(
  workspaceOrder: string[],
  projectOrder: string[],
  workspaces: Record<string, Workspace>,
  agents: Record<string, Agent>,
  agentOrder: string[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of workspaceOrder) {
    if (!workspaces[id] || seen.has(id)) continue;
    out.push(id);
    seen.add(id);
    for (const project of projectsInWorkspace(agents, projectOrder, agentOrder, id)) {
      if (seen.has(project.id)) continue;
      out.push(project.id);
      seen.add(project.id);
    }
  }
  for (const id of projectOrder) {
    if (seen.has(id) || !agents[id] || !isProject(agents[id])) continue;
    out.push(id);
    seen.add(id);
  }
  return out;
}

function resolvedFlatFolderOrder(input: ChatsRowsInput): string[] {
  const stored = input.flatFolderOrder ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of stored) {
    if (seen.has(id)) continue;
    if (input.workspaces[id]) {
      out.push(id);
      seen.add(id);
      continue;
    }
    if (input.agents[id] && isProject(input.agents[id])) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of defaultFlatFolderOrder(
    input.workspaceOrder,
    input.projectOrder,
    input.workspaces,
    input.agents,
    input.agentOrder,
  )) {
    if (seen.has(id)) continue;
    out.push(id);
    seen.add(id);
  }
  return out;
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
    .filter(
      (a): a is Agent => !!a && isProject(a) && !isAgentPinned(input.pinnedAgents, a.id),
    );
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

function nestedWorkspaceRows(input: ChatsRowsInput): ChatsRow[] {
  const projects = listedProjects(input);
  const hosts: { id: string; workspace: Workspace }[] = [];
  const indexOf = new Map<string, number>();

  const addHost = (id: string, workspace: Workspace, afterId?: string) => {
    if (indexOf.has(id)) return;
    let at = hosts.length;
    if (afterId !== undefined) {
      const after = indexOf.get(afterId);
      if (after !== undefined) at = after + 1;
    }
    hosts.splice(at, 0, { id, workspace });
    indexOf.clear();
    hosts.forEach((h, i) => indexOf.set(h.id, i));
  };

  for (const id of input.workspaceOrder) {
    const workspace = input.workspaces[id];
    if (workspace) addHost(id, workspace);
  }

  const byHost = new Map<string, Agent[]>();
  for (const project of projects) {
    const folder = resolveProjectFolder(
      project.id,
      input.agents,
      input.agentOrder,
      input.workspaces,
    );
    const workspace = input.workspaces[folder.id] ?? { id: folder.id, name: folder.name };
    if (!indexOf.has(folder.id)) {
      const lastMember = [...folder.memberIds].reverse().find((id) => indexOf.has(id));
      addHost(folder.id, workspace, lastMember);
    }
    const list = byHost.get(folder.id) ?? [];
    list.push(project);
    byHost.set(folder.id, list);
  }

  return withLastUnpadded(
    hosts.map((h) => ({
      kind: "workspace" as const,
      id: h.id,
      workspace: h.workspace,
      padded: true,
      projects: byHost.get(h.id),
    })),
  );
}

export function chatsRows(input: ChatsRowsInput): ChatsRow[] {
  switch (input.groupBy) {
    case "workspace": {
      if (input.flat && input.nestProjects) return nestedWorkspaceRows(input);
      if (input.flat) {
        const rows: ChatsRow[] = [];
        for (const id of resolvedFlatFolderOrder(input)) {
          const workspace = input.workspaces[id];
          if (workspace) {
            rows.push({ kind: "workspace", id, workspace, padded: true });
            continue;
          }
          const project = input.agents[id];
          if (!project || !isProject(project) || isAgentPinned(input.pinnedAgents, project.id)) {
            continue;
          }
          rows.push({ kind: "project", id, project, padded: true });
        }
        return withLastUnpadded(rows);
      }
      const rows: ChatsRow[] = [];
      for (const id of input.workspaceOrder) {
        const workspace = input.workspaces[id];
        if (!workspace) continue;
        rows.push({ kind: "workspace", id, workspace, padded: true });
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
        const recency = (row: ChatsRow): number => {
          switch (row.kind) {
            case "project":
              return projectRecency(row.project, input.agents, input.agentOrder);
            case "agent":
              return row.agent.updatedAt;
            case "workspace":
              return 0;
            default: {
              const _exhaustive: never = row;
              return _exhaustive;
            }
          }
        };
        return recency(b) - recency(a) || a.id.localeCompare(b.id);
      });
      return withLastUnpadded(rows);
    }
    default: {
      const _exhaustive: never = input.groupBy;
      return _exhaustive;
    }
  }
}
