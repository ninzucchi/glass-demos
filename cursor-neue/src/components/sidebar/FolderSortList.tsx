import { useLayoutEffect, useRef, useState } from "react";
import { isProject } from "@/types";
import { useTabDragStore } from "@/store/tabDrag";
import { useWorkspaceDragStore } from "@/store/workspaceDrag";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { AgentList } from "@/components/sidebar/AgentList";
import { ProjectGroup } from "@/components/sidebar/ProjectGroup";
import { WorkspaceGroup } from "@/components/sidebar/WorkspaceGroup";
import type { ChatsRow } from "@/components/sidebar/chatsRows";
import {
  sortBlockShifts,
  sortInsertIndex,
  sortInsertShifts,
  sortInsertionIndex,
  type SortMetrics,
} from "@/components/sidebar/sidebarSort";

function ChatsRowView({ row }: { row: ChatsRow }) {
  switch (row.kind) {
    case "workspace":
      return (
        <WorkspaceGroup workspace={row.workspace} padded={row.padded} projects={row.projects} />
      );
    case "project":
      return <ProjectGroup project={row.project} padded={row.padded} />;
    case "agent":
      return <AgentList agents={[row.agent]} />;
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

function measureList(list: HTMLElement): SortMetrics {
  const els = Array.from(list.querySelectorAll<HTMLElement>("[data-folder-block]"));
  const listRect = list.getBoundingClientRect();
  return {
    ids: els.map((el) => el.dataset.folderBlock ?? ""),
    tops: els.map((el) => el.getBoundingClientRect().top - listRect.top + list.scrollTop),
    heights: els.map((el) => el.getBoundingClientRect().height),
  };
}

/** Flat Chats list: workspaces and projects are one sortable sequence. */
export function FolderSortList({ rows }: { rows: ChatsRow[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<SortMetrics | null>(null);
  const workspaceId = useWorkspaceDragStore((s) => s.source?.workspaceId ?? null);
  const workspacePointer = useWorkspaceDragStore((s) => s.pointer);
  const tabAgentId = useTabDragStore((s) =>
    s.source?.agentId && !s.source.tabId ? s.source.agentId : null,
  );
  const tabPointer = useTabDragStore((s) => s.pointer);
  const nestProjects = useFeatureFlags((s) => s.sidebarProjects === "flatNested");
  const projectId = useWorkspaceStore((s) => {
    if (!tabAgentId) return null;
    const agent = s.agents[tabAgentId];
    return agent && isProject(agent) ? agent.id : null;
  });
  // FlatNested: projects stay in their workspace folder. They may still pin,
  // but they do not drive list re-sort.
  const sortProjectId = nestProjects ? null : projectId;
  const draggingId = workspaceId ?? sortProjectId;
  const pointer = workspaceId ? workspacePointer : tabPointer;
  const [scrollTick, setScrollTick] = useState(0);
  const [shifts, setShifts] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!draggingId) {
      metricsRef.current = null;
      setShifts({});
      return;
    }
    const list = listRef.current;
    if (!list) return;
    metricsRef.current = measureList(list);
  }, [draggingId]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!draggingId) return;
    const onScroll = () => setScrollTick((n) => n + 1);
    list?.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      list?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [draggingId]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!draggingId || !list) {
      if (workspaceId) useWorkspaceDragStore.getState().setOverIndex(null);
      if (projectId) useTabDragStore.getState().setListIndex(null);
      return;
    }
    const rect = list.getBoundingClientRect();
    const overList =
      pointer.x >= rect.left &&
      pointer.x <= rect.right &&
      pointer.y >= rect.top &&
      pointer.y <= rect.bottom;
    const captured = metricsRef.current ?? measureList(list);
    metricsRef.current = captured;
    const from = captured.ids.indexOf(draggingId);
    if (!overList) {
      if (workspaceId) useWorkspaceDragStore.getState().setOverIndex(from < 0 ? null : from);
      if (projectId) useTabDragStore.getState().setListIndex(null);
      setShifts({});
      return;
    }
    const y = pointer.y - rect.top + list.scrollTop;
    if (from >= 0) {
      const to = sortInsertionIndex(y, captured.tops, captured.heights);
      if (workspaceId) useWorkspaceDragStore.getState().setOverIndex(to);
      if (projectId) useTabDragStore.getState().setListIndex(to);
      setShifts(sortBlockShifts(captured, from, to));
      return;
    }
    const incoming = document.querySelector<HTMLElement>(
      `[data-sidebar-project-id="${draggingId}"]`,
    );
    const insertHeight = incoming?.getBoundingClientRect().height ?? 28;
    const to = sortInsertIndex(y, captured.tops, captured.heights);
    if (projectId) useTabDragStore.getState().setListIndex(to);
    setShifts(sortInsertShifts(captured, to, insertHeight));
  }, [draggingId, workspaceId, projectId, pointer.x, pointer.y, scrollTick]);

  const dragging = !!draggingId;

  return (
    <div ref={listRef} data-folder-list="" className="relative flex flex-col gap-1">
      {rows.map((row) => (
        <div
          key={row.id}
          data-folder-block={row.id}
          className={
            dragging
              ? "transition-transform duration-slow ease-out-quart"
              : undefined
          }
          style={{ transform: `translateY(${shifts[row.id] ?? 0}px)` }}
        >
          <ChatsRowView row={row} />
        </div>
      ))}
    </div>
  );
}
