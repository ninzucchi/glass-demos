import type { MouseEvent as ReactMouseEvent } from "react";
import {
  DEFAULT_WORKSPACE_ID,
  isAgentPinned,
  isProject,
  isTrackerOwner,
  isWorkspace,
  primaryWorkspaceId,
  resolvedGroupParentId,
} from "@/types";
import { blankProjectTitle } from "@/lib/mergedLabels";
import { useUiStore } from "@/store/useUiStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Visible agent rows in sidebar document order. Skips collapsed folder bodies. */
export function sidebarAgentIdsInView(from: HTMLElement): string[] {
  const root = from.closest("aside");
  if (!root) return [];
  const ids: string[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("[data-sidebar-agent-id]")) {
    if (el.closest("[aria-hidden='true']")) continue;
    const id = el.dataset.sidebarAgentId;
    if (id) ids.push(id);
  }
  return ids;
}

function rangeInclusive(ids: string[], fromId: string, toId: string): string[] {
  const a = ids.indexOf(fromId);
  const b = ids.indexOf(toId);
  if (a < 0 || b < 0) return [toId];
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return [...new Set(ids.slice(lo, hi + 1))];
}

/** Command toggles the set. Shift ranges from the anchor. Plain click
 *  replaces the set and opens the agent. Modifier clicks do not open. */
export function applySidebarAgentClick(opts: {
  windowId: string;
  agentId: string;
  event: ReactMouseEvent<HTMLElement>;
  fromEl: HTMLElement;
  activeAgentId: string | undefined;
  setActiveAgent: (windowId: string, id: string) => void;
}): void {
  const { windowId, agentId, event, fromEl, activeAgentId, setActiveAgent } = opts;
  const ui = useUiStore.getState();
  const cur = ui.sidebarAgentSelection[windowId];
  const additive = event.metaKey;

  if (event.shiftKey) {
    event.preventDefault();
    const visible = sidebarAgentIdsInView(fromEl);
    const anchor = cur?.anchorId ?? activeAgentId ?? agentId;
    ui.setSidebarAgentSelection(windowId, {
      ids: rangeInclusive(visible, anchor, agentId),
      anchorId: cur?.anchorId ?? anchor,
    });
    return;
  }

  if (additive) {
    event.preventDefault();
    const base = cur?.ids.length ? cur.ids : activeAgentId ? [activeAgentId] : [];
    const ids = base.includes(agentId)
      ? base.filter((id) => id !== agentId)
      : [...base, agentId];
    ui.setSidebarAgentSelection(windowId, { ids, anchorId: agentId });
    return;
  }

  ui.setSidebarAgentSelection(windowId, { ids: [agentId], anchorId: agentId });
  setActiveAgent(windowId, agentId);
}

/** Pin/Archive/drag target the whole set when the row is already in a multi-select. */
export function sidebarAgentActionIds(
  windowId: string,
  agentId: string,
): string[] {
  const ids = useUiStore.getState().sidebarAgentSelection[windowId]?.ids ?? [];
  if (ids.length > 1 && ids.includes(agentId)) return ids;
  return [agentId];
}

/** Pin, unpin, or re-parent only the agents that are not already in `dest`.
 *  Returns agents that newly joined a project (not unpin-only moves). */
export function applySidebarAgentDrop(
  windowId: string,
  ids: string[],
  dest: { kind: "project"; projectId: string } | { kind: "pinned" } | { kind: "chats" },
): string[] {
  const joined: string[] = [];
  for (const id of ids) {
    const live = useWorkspaceStore.getState();
    const agent = live.agents[id];
    if (!agent || isTrackerOwner(agent)) continue;
    const pinnedNow = isAgentPinned(live.pinnedAgents, id);
    switch (dest.kind) {
      case "project": {
        const alreadyIn = agent.projectId === dest.projectId;
        if (alreadyIn && !pinnedNow) break;
        live.moveAgentToProject(windowId, id, dest.projectId);
        if (!alreadyIn) joined.push(id);
        break;
      }
      case "pinned":
        if (!pinnedNow) live.togglePinnedAgent(id);
        break;
      case "chats":
        if (pinnedNow) live.togglePinnedAgent(id);
        else if (agent.projectId || resolvedGroupParentId(agent)) {
          live.moveAgentToProject(windowId, id, null);
        }
        break;
      default: {
        const _exhaustive: never = dest;
        return _exhaustive;
      }
    }
  }
  return joined;
}

/** Re-parent agents, announce the join, and pulse their cards. */
export function moveAgentsIntoProject(
  windowId: string,
  ids: string[],
  projectId: string,
): void {
  const joined = applySidebarAgentDrop(windowId, ids, { kind: "project", projectId });
  const dest = useWorkspaceStore.getState().agents[projectId];
  if (joined.length && isProject(dest)) {
    useWorkspaceStore.getState().appendProjectJoinNotice(projectId, joined);
    useUiStore.getState().pulseJoinedAgents(joined);
  }
}

/** Drop onto the Projects section: make a folder project and move the agents in. */
export function createProjectFromDroppedAgents(windowId: string, ids: string[]): void {
  const workspace = useWorkspaceStore.getState();
  const agents = ids
    .map((id) => workspace.agents[id])
    .filter(
      (agent): agent is NonNullable<typeof agent> =>
        !!agent && !isProject(agent) && !isWorkspace(agent) && !agent.thread,
    );
  if (agents.length === 0) return;
  const workspaceId = primaryWorkspaceId(agents[0]) || DEFAULT_WORKSPACE_ID;
  const projectId = workspace.createProject(windowId, {
    title: blankProjectTitle(),
    workspaceId,
    icon: "folder",
    color: "default",
    groupParentId: null,
  });
  if (!projectId) return;
  moveAgentsIntoProject(windowId, agents.map((agent) => agent.id), projectId);
  useUiStore.getState().setSidebarAgentSelection(windowId, {
    ids: [],
    anchorId: projectId,
  });
}

/** After Move to → New Project, re-parent the queued agents. */
export function finishPendingMoveToProject(windowId: string, projectId: string): void {
  const ids = useUiStore.getState().pendingMoveAgentIds;
  if (!ids?.length) return;
  useUiStore.getState().setPendingMoveAgentIds(null);
  moveAgentsIntoProject(windowId, ids, projectId);
}
