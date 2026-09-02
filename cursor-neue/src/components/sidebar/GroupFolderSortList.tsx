import { useLayoutEffect, useRef, useState } from "react";
import { isTrackerOwner, type Agent } from "@/types";
import { useTabDragStore } from "@/store/tabDrag";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { AgentList } from "@/components/sidebar/AgentList";
import { ProjectGroup } from "@/components/sidebar/ProjectGroup";
import {
  sortBlockShifts,
  sortInsertIndex,
  sortInsertShifts,
  sortInsertionIndex,
  type SortMetrics,
} from "@/components/sidebar/sidebarSort";

function measureList(list: HTMLElement): SortMetrics {
  const els = Array.from(list.querySelectorAll<HTMLElement>("[data-folder-block]"));
  const listRect = list.getBoundingClientRect();
  return {
    ids: els.map((el) => el.dataset.folderBlock ?? ""),
    tops: els.map((el) => el.getBoundingClientRect().top - listRect.top + list.scrollTop),
    heights: els.map((el) => el.getBoundingClientRect().height),
  };
}

/** Projects / Repositories grouping: drag top-level folders to reorder. */
export function GroupFolderSortList({ folders }: { folders: Agent[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<SortMetrics | null>(null);
  const draggingId = useTabDragStore((s) =>
    s.source?.agentId && !s.source.tabId ? s.source.agentId : null,
  );
  const pointer = useTabDragStore((s) => s.pointer);
  const draggingFolder = useWorkspaceStore((s) => {
    if (!draggingId) return false;
    const agent = s.agents[draggingId];
    return !!agent && isTrackerOwner(agent);
  });
  const [scrollTick, setScrollTick] = useState(0);
  const [shifts, setShifts] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!draggingFolder) {
      metricsRef.current = null;
      setShifts({});
      return;
    }
    const list = listRef.current;
    if (!list) return;
    metricsRef.current = measureList(list);
  }, [draggingFolder, draggingId]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!draggingFolder) return;
    const onScroll = () => setScrollTick((n) => n + 1);
    list?.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      list?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [draggingFolder]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const metrics = metricsRef.current;
    if (!draggingFolder || !draggingId || !list) {
      useTabDragStore.getState().setListIndex(null);
      return;
    }
    const rect = list.getBoundingClientRect();
    const overList =
      pointer.x >= rect.left &&
      pointer.x <= rect.right &&
      pointer.y >= rect.top &&
      pointer.y <= rect.bottom;
    if (!overList) {
      useTabDragStore.getState().setListIndex(null);
      setShifts({});
      return;
    }
    const y = pointer.y - rect.top + list.scrollTop;
    const captured = metrics ?? measureList(list);
    metricsRef.current = captured;
    const from = captured.ids.indexOf(draggingId);
    if (from >= 0) {
      const to = sortInsertionIndex(y, captured.tops, captured.heights);
      useTabDragStore.getState().setListIndex(to, "group-folder-order");
      setShifts(sortBlockShifts(captured, from, to));
      return;
    }
    const incoming = document.querySelector<HTMLElement>(
      `[data-sidebar-project-id="${draggingId}"]`,
    );
    const insertHeight = incoming?.getBoundingClientRect().height ?? 28;
    const to = sortInsertIndex(y, captured.tops, captured.heights);
    useTabDragStore.getState().setListIndex(to, "group-folder-order");
    setShifts(sortInsertShifts(captured, to, insertHeight));
  }, [draggingFolder, draggingId, pointer.x, pointer.y, scrollTick]);

  return (
    <div ref={listRef} data-folder-list="" className="relative flex flex-col gap-px">
      {folders.map((folder, i) =>
        isTrackerOwner(folder) ? (
          <div
            key={folder.id}
            data-folder-block={folder.id}
            className={
              draggingFolder
                ? "transition-transform duration-slow ease-out-quart"
                : undefined
            }
            style={{ transform: `translateY(${shifts[folder.id] ?? 0}px)` }}
          >
            <ProjectGroup project={folder} padded={i < folders.length - 1} />
          </div>
        ) : (
          <AgentList key={folder.id} agents={[folder]} />
        ),
      )}
    </div>
  );
}
