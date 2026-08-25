import { useLayoutEffect, useEffect, useRef, type RefObject } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTabDragStore } from "@/store/tabDrag";
import { useWorkspaceDragStore } from "@/store/workspaceDrag";

/** Marker for a sidebar row that should translate when it changes slot. */
export const SIDEBAR_FLIP_ATTR = "data-sidebar-flip";

const FLIP_THRESHOLD_PX = 0.5;

type Point = { top: number; left: number };
type Rects = Map<string, Point>;

const running = new WeakMap<HTMLElement, Animation>();

function measure(root: HTMLElement): Rects {
  const next: Rects = new Map();
  const els = root.querySelectorAll<HTMLElement>(`[${SIDEBAR_FLIP_ATTR}]`);
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    const id = el.getAttribute(SIDEBAR_FLIP_ATTR);
    if (!id) continue;
    const r = el.getBoundingClientRect();
    next.set(id, { top: r.top, left: r.left });
  }
  return next;
}

function flipTiming(): { duration: number; easing: string } {
  const styles = getComputedStyle(document.documentElement);
  const raw = styles.getPropertyValue("--duration-slow").trim();
  const duration = Number.parseFloat(raw) || 200;
  const easing =
    styles.getPropertyValue("--ease-out-quart").trim() || "cubic-bezier(0.25, 1, 0.5, 1)";
  return { duration, easing };
}

function ancestorMovedWith(
  el: HTMLElement,
  root: HTMLElement,
  from: Rects,
  to: Rects,
  dx: number,
  dy: number,
): boolean {
  let parent = el.parentElement;
  while (parent && parent !== root) {
    const id = parent.getAttribute(SIDEBAR_FLIP_ATTR);
    if (id) {
      const a = from.get(id);
      const b = to.get(id);
      if (a && b) {
        const adx = a.left - b.left;
        const ady = a.top - b.top;
        return Math.abs(dx - adx) < 1 && Math.abs(dy - ady) < 1;
      }
    }
    parent = parent.parentElement;
  }
  return false;
}

function play(root: HTMLElement, from: Rects, to: Rects) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { duration, easing } = flipTiming();
  const els = root.querySelectorAll<HTMLElement>(`[${SIDEBAR_FLIP_ATTR}]`);
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    const id = el.getAttribute(SIDEBAR_FLIP_ATTR);
    if (!id) continue;
    const a = from.get(id);
    const b = to.get(id);
    if (!a || !b) continue;
    const dy = a.top - b.top;
    const dx = a.left - b.left;
    if (Math.abs(dx) < FLIP_THRESHOLD_PX && Math.abs(dy) < FLIP_THRESHOLD_PX) continue;
    if (ancestorMovedWith(el, root, from, to, dx, dy)) continue;
    running.get(el)?.cancel();
    const anim = el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
      { duration, easing },
    );
    running.set(el, anim);
    void anim.finished
      .then(() => {
        if (running.get(el) === anim) running.delete(el);
      })
      .catch(() => {
        if (running.get(el) === anim) running.delete(el);
      });
  }
}

function cancelFlip(root: HTMLElement) {
  const els = root.querySelectorAll<HTMLElement>(`[${SIDEBAR_FLIP_ATTR}]`);
  for (let i = 0; i < els.length; i++) {
    running.get(els[i])?.cancel();
  }
}

function isSidebarDragging(): boolean {
  return !!(useTabDragStore.getState().source || useWorkspaceDragStore.getState().source);
}

function watchDragSkip(skipRef: { current: boolean }): () => void {
  const onChange = (source: unknown, prevSource: unknown) => {
    if (source) skipRef.current = true;
    if (prevSource && !source) {
      // Drop updates the list in the same commit. The flip effect reads this
      // flag first; clear it after paint so a later pin/menu move still plays.
      requestAnimationFrame(() => {
        skipRef.current = false;
      });
    }
  };
  const unsubTab = useTabDragStore.subscribe((s, p) => onChange(s.source, p.source));
  const unsubWs = useWorkspaceDragStore.subscribe((s, p) =>
    onChange(s.source, p.source),
  );
  return () => {
    unsubTab();
    unsubWs();
  };
}

/** Translate marked rows from their last slot to the new one (FLIP).
 *  Plays for pin, menu move, and chrome remounts. Skips after drag-and-drop:
 *  neighbors already translated during the drag. Folder collapse keeps its
 *  own height motion and does not trigger this. */
export function useSidebarFlip(
  rootRef: RefObject<HTMLElement | null>,
  /** Extra key when chrome (group-by, experiment mode) remounts the same ids. */
  layoutKey = "",
) {
  const prevRef = useRef<Rects>(new Map());
  const skipFromDragRef = useRef(false);
  const flipGen = useWorkspaceStore((s) =>
    [
      s.workspaceOrder.join("\0"),
      s.projectOrder.join("\0"),
      s.agentOrder.join("\0"),
      s.pinnedAgents.join("\0"),
      s.agentOrder.map((id) => `${id}:${s.agents[id]?.projectId ?? ""}`).join("\0"),
    ].join("|"),
  );

  useEffect(() => watchDragSkip(skipFromDragRef), []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    cancelFlip(root);
    const next = measure(root);
    const fromDrag = skipFromDragRef.current || isSidebarDragging();
    if (!fromDrag) play(root, prevRef.current, next);
    prevRef.current = next;
  }, [flipGen, layoutKey, rootRef]);
}
