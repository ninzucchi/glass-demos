import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceDragStore } from "@/store/workspaceDrag";
import { AgentList } from "@/components/sidebar/AgentList";
import { ProjectGroup } from "@/components/sidebar/ProjectGroup";
import { WorkspaceGroup } from "@/components/sidebar/WorkspaceGroup";
import type { ChatsRow } from "@/components/sidebar/chatsRows";
import { sortBlockShifts, sortInsertionIndex, type SortMetrics } from "@/components/sidebar/sidebarSort";

interface WorkspaceBlock {
  id: string;
  rows: ChatsRow[];
}

/** Workspace row plus any Flat projects that follow it in the chats list. */
function workspaceBlocks(rows: ChatsRow[]): WorkspaceBlock[] {
  const blocks: WorkspaceBlock[] = [];
  for (const row of rows) {
    if (row.kind === "workspace") {
      blocks.push({ id: row.id, rows: [row] });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (row.kind === "project" && last) last.rows.push(row);
  }
  return blocks;
}

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

/** Workspace-grouped chats list. While a workspace is dragged, blocks translate
 *  so neighbors make a gap at the insertion slot (sortable-list motion). */
export function WorkspaceSortList({ rows }: { rows: ChatsRow[] }) {
  const blocks = useMemo(() => workspaceBlocks(rows), [rows]);
  const listRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<SortMetrics | null>(null);
  const source = useWorkspaceDragStore((s) => s.source);
  const pointer = useWorkspaceDragStore((s) => s.pointer);
  const [scrollTick, setScrollTick] = useState(0);
  const [shifts, setShifts] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!source) {
      metricsRef.current = null;
      setShifts({});
      return;
    }
    const list = listRef.current;
    if (!list) return;
    const els = Array.from(list.querySelectorAll<HTMLElement>("[data-workspace-block]"));
    const listRect = list.getBoundingClientRect();
    metricsRef.current = {
      ids: els.map((el) => el.dataset.workspaceBlock ?? ""),
      tops: els.map(
        (el) => el.getBoundingClientRect().top - listRect.top + list.scrollTop,
      ),
      heights: els.map((el) => el.getBoundingClientRect().height),
    };
  }, [source]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!source) return;
    const onScroll = () => setScrollTick((n) => n + 1);
    list?.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      list?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [source]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const metrics = metricsRef.current;
    if (!source || !list || !metrics) {
      useWorkspaceDragStore.getState().setOverIndex(null);
      return;
    }
    const from = metrics.ids.indexOf(source.workspaceId);
    const rect = list.getBoundingClientRect();
    const overList =
      pointer.x >= rect.left &&
      pointer.x <= rect.right &&
      pointer.y >= rect.top &&
      pointer.y <= rect.bottom;
    if (from < 0 || !overList) {
      useWorkspaceDragStore.getState().setOverIndex(from < 0 ? null : from);
      setShifts({});
      return;
    }
    const y = pointer.y - rect.top + list.scrollTop;
    const to = sortInsertionIndex(y, metrics.tops, metrics.heights);
    useWorkspaceDragStore.getState().setOverIndex(to);
    setShifts(sortBlockShifts(metrics, from, to));
  }, [source, pointer.x, pointer.y, scrollTick]);

  const dragging = !!source;

  return (
    <div ref={listRef} data-workspace-list="" className="relative flex flex-col gap-1">
      {blocks.map((block) => (
        <div
          key={block.id}
          data-workspace-block={block.id}
          className={
            dragging
              ? "flex flex-col gap-1 transition-transform duration-slow ease-out-quart"
              : "flex flex-col gap-1"
          }
          style={{ transform: `translateY(${shifts[block.id] ?? 0}px)` }}
        >
          {block.rows.map((row) => (
            <ChatsRowView key={row.id} row={row} />
          ))}
        </div>
      ))}
    </div>
  );
}
