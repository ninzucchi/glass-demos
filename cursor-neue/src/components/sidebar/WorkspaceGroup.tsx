import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  agentInWorkspace,
  isAgentPinned,
  isMainListItem,
  isProject,
  isUnionWorkspaceId,
  resolveProjectFolder,
  sortSidebarFolderItems,
  type Agent,
  type Workspace,
  workspaceFolderCollapsed,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useFeatureFlags, useMergedSidebar } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { useWindow, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { SidebarCollapse } from "@/components/sidebar/SidebarCollapse";
import { AgentList } from "@/components/sidebar/AgentList";
import { useDragWorkspaceOut } from "@/components/sidebar/useWorkspaceDrag";

const FOLDERS_VISIBLE = 5;
const FOCUS_VISIBLE = 3;
/** Focus Folders: More only when it would reveal at least two extra rows. */
const FOCUS_MORE_AT = FOCUS_VISIBLE + 2;

export function WorkspaceGroup({
  workspace,
  padded = true,
}: {
  workspace: Workspace;
  /** False when this folder is the last row in its section. */
  padded?: boolean;
}) {
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const pinnedAgents = useWorkspaceStore((s) => s.pinnedAgents);
  const merged = useMergedSidebar();
  const foldersMode = useFeatureFlags((s) => s.projectFolders);
  const windowId = useWindowId();
  const win = useWindow();
  // Collapse is per-window so toggling a folder here never reorders another
  // window's sidebar (workspaces themselves are shared).
  const collapsed = workspaceFolderCollapsed(workspace, win?.collapsedSidebar);
  const toggleSidebarCollapsed = useWorkspaceStore((s) => s.toggleSidebarCollapsed);
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  const activeAgentId = win?.activeAgentId;
  const unionFolder = isUnionWorkspaceId(workspace.id);
  const workspaceSelected = merged && !unionFolder && activeAgentId === workspace.id;
  const drag = useDragWorkspaceOut(workspace.id, workspace.name);
  const onPointerDown = unionFolder ? undefined : drag.onPointerDown;
  const dragging = unionFolder ? false : drag.dragging;
  const wasDragged = unionFolder ? () => false : drag.wasDragged;
  // One-way: More reveals the rest of the folder. No less — the
  // expanded list stays open for the life of this mount.
  const [expanded, setExpanded] = useState(false);

  const list = useMemo(
    () =>
      sortSidebarFolderItems(
        agentOrder
          .map((id) => agents[id])
          .filter((a): a is Agent => {
            if (!a || isAgentPinned(pinnedAgents, a.id)) return false;
            if (!isMainListItem(a, true)) return false;
            if (isProject(a)) {
              return (
                resolveProjectFolder(a.id, agents, agentOrder, workspaces) === workspace.id
              );
            }
            if (unionFolder) return false;
            if (!agentInWorkspace(a, workspace.id)) return false;
            return true;
          }),
        agents,
        agentOrder,
      ),
    [agentOrder, agents, merged, pinnedAgents, unionFolder, workspace.id, workspaces],
  );
  // Repo folders stay regular folders. Focus Folders and Agents only change
  // project rows.
  const collapsible = true;

  const visible = foldersMode === "folders" ? FOLDERS_VISIBLE : FOCUS_VISIBLE;
  const truncated =
    foldersMode === "folders" ? list.length > visible : list.length >= FOCUS_MORE_AT;
  const shown = expanded || !truncated ? list : list.slice(0, visible);
  const showMore = !expanded && truncated;

  return (
    <div className={clsx("flex flex-col gap-px", dragging && "opacity-40")}>
      <div onPointerDown={onPointerDown}>
        <SidebarCell
          label={workspace.name}
          leading={{
            kind: "workspace",
            collapsed,
            hitTarget: merged && collapsible,
            collapsible,
          }}
          selected={workspaceSelected}
          onLeadingClick={
            collapsible && merged
              ? () => toggleSidebarCollapsed(windowId, workspace.id)
              : undefined
          }
          onClick={() => {
            if (wasDragged()) return;
            if (!merged || unionFolder) {
              if (collapsible) toggleSidebarCollapsed(windowId, workspace.id);
              return;
            }
            useUiStore.getState().setSidebarAgentSelection(windowId, {
              ids: [],
              anchorId: workspace.id,
            });
            setActiveAgent(windowId, workspace.id);
          }}
          onAddClick={
            unionFolder
              ? undefined
              : () => createAgent(windowId, { workspaceId: workspace.id })
          }
        />
      </div>
      {collapsible && (
        <SidebarCollapse
          open={!collapsed}
          padded={padded}
          threadParentLevel={merged ? 0 : undefined}
        >
          <div className="flex flex-col gap-px">
            <AgentList agents={shown} nestLevel={1} />
            {showMore && (
              // No leading icon: SidebarCell still reserves the agent 20px slot so
              // the label lines up with agent titles.
              <SidebarCell muted nestLevel={1} label="More" onClick={() => setExpanded(true)} />
            )}
          </div>
        </SidebarCollapse>
      )}
    </div>
  );
}
