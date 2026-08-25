import { useLayoutEffect, useRef, useState } from "react";
import { isProject, type Agent } from "@/types";
import { useTabDragStore } from "@/store/tabDrag";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { ProjectGroup } from "@/components/sidebar/ProjectGroup";
import {
  sortBlockShifts,
  sortInsertIndex,
  sortInsertShifts,
  sortInsertionIndex,
  type SortMetrics,
} from "@/components/sidebar/sidebarSort";

function measureList(list: HTMLElement): SortMetrics {
  const els = Array.from(list.querySelectorAll<HTMLElement>("[data-project-block]"));
  const listRect = list.getBoundingClientRect();
  return {
    ids: els.map((el) => el.dataset.projectBlock ?? ""),
    tops: els.map((el) => el.getBoundingClientRect().top - listRect.top + list.scrollTop),
    heights: els.map((el) => el.getBoundingClientRect().height),
  };
}

/** Projects section list. A project drag inside the list reorders; a drag over
 *  Pinned still pins. A pinned project dragged back in opens a gap to insert. */
export function ProjectSortList({ projects }: { projects: Agent[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<SortMetrics | null>(null);
  const draggingId = useTabDragStore((s) =>
    s.source?.agentId && !s.source.tabId ? s.source.agentId : null,
  );
  const pointer = useTabDragStore((s) => s.pointer);
  const draggingProject = useWorkspaceStore((s) => {
    if (!draggingId) return false;
    const agent = s.agents[draggingId];
    return !!agent && isProject(agent);
  });
  const [scrollTick, setScrollTick] = useState(0);
  const [shifts, setShifts] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!draggingProject) {
      metricsRef.current = null;
      setShifts({});
      return;
    }
    const list = listRef.current;
    if (!list) return;
    metricsRef.current = measureList(list);
  }, [draggingProject, draggingId]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!draggingProject) return;
    const onScroll = () => setScrollTick((n) => n + 1);
    list?.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      list?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [draggingProject]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const metrics = metricsRef.current;
    if (!draggingProject || !draggingId || !list) {
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
      useTabDragStore.getState().setListIndex(to);
      setShifts(sortBlockShifts(captured, from, to));
      return;
    }
    const incoming =
      document.querySelector<HTMLElement>(`[data-sidebar-project-id="${draggingId}"]`);
    const insertHeight = incoming?.getBoundingClientRect().height ?? 28;
    const to = sortInsertIndex(y, captured.tops, captured.heights);
    useTabDragStore.getState().setListIndex(to);
    setShifts(sortInsertShifts(captured, to, insertHeight));
  }, [draggingProject, draggingId, pointer.x, pointer.y, scrollTick]);

  return (
    <div ref={listRef} data-project-list="" className="relative flex flex-col gap-1">
      {projects.map((project, i) => (
        <div
          key={project.id}
          data-project-block={project.id}
          className={
            draggingProject
              ? "transition-transform duration-slow ease-out-quart"
              : undefined
          }
          style={{ transform: `translateY(${shifts[project.id] ?? 0}px)` }}
        >
          <ProjectGroup
            project={project}
            padded={i < projects.length - 1}
          />
        </div>
      ))}
    </div>
  );
}
