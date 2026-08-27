import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

const DRAG_DISTANCE_THRESHOLD = 2;
const DRAG_TIME_THRESHOLD = 50;

type DragState = {
  isDragging: boolean;
  didDrag: boolean;
  startX: number;
  startY: number;
  startTime: number;
  scrollLeft: number;
  velX: number;
  pointerId: number;
  momentumId: number | null;
};

type DragPointer = ReactPointerEvent<HTMLElement> | PointerEvent;

/** Click-drag a horizontal overflow scroller. Mouse only; touch stays native.
 *  After a real drag, the next click is swallowed so child cards do not fire. */
export function useDragScroll(containerRef: RefObject<HTMLElement | null>) {
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<DragState>({
    isDragging: false,
    didDrag: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    scrollLeft: 0,
    velX: 0,
    pointerId: 0,
    momentumId: null,
  });

  const hasHorizontalOverflow = () => {
    const el = containerRef.current;
    return el ? el.scrollWidth > el.clientWidth : false;
  };

  const cancelMomentumTracking = () => {
    if (dragState.current.momentumId !== null) {
      cancelAnimationFrame(dragState.current.momentumId);
      dragState.current.momentumId = null;
    }
  };

  const momentumLoop = () => {
    if (!containerRef.current) return;
    const state = dragState.current;
    containerRef.current.scrollLeft += state.velX;
    state.velX *= 0.9;
    if (Math.abs(state.velX) > 0.5) {
      state.momentumId = requestAnimationFrame(momentumLoop);
    }
  };

  const beginMomentumTracking = () => {
    cancelMomentumTracking();
    dragState.current.momentumId = requestAnimationFrame(momentumLoop);
  };

  const checkDragThreshold = (currentX: number, currentY: number) => {
    const state = dragState.current;
    const dx = Math.abs(currentX - state.startX);
    const dy = Math.abs(currentY - state.startY);
    const timeDiff = Date.now() - state.startTime;
    return (
      dx > DRAG_DISTANCE_THRESHOLD ||
      dy > DRAG_DISTANCE_THRESHOLD ||
      timeDiff > DRAG_TIME_THRESHOLD
    );
  };

  const handleUp = (event: DragPointer) => {
    const state = dragState.current;
    if (!state.isDragging || event.pointerId !== state.pointerId) return;

    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleUp);

    if (state.didDrag) event.preventDefault();
    state.isDragging = false;
    setIsDragging(false);

    const el = containerRef.current;
    if (el) {
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
      if (state.didDrag) {
        const blockClick = (click: MouseEvent) => {
          click.preventDefault();
          click.stopImmediatePropagation();
        };
        el.addEventListener("click", blockClick, { capture: true, once: true });
        setTimeout(() => {
          el.removeEventListener("click", blockClick, { capture: true });
        }, 100);
        state.didDrag = false;
      }
    }

    beginMomentumTracking();
  };

  const handleDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      !hasHorizontalOverflow()
    ) {
      return;
    }
    if (!containerRef.current) return;

    event.preventDefault();
    const state = dragState.current;
    state.isDragging = true;
    setIsDragging(true);
    state.didDrag = false;
    state.startX = event.pageX;
    state.startY = event.pageY;
    state.startTime = Date.now();
    state.scrollLeft = containerRef.current.scrollLeft;
    state.pointerId = event.pointerId;
    cancelMomentumTracking();

    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  const handleMove = (event: ReactPointerEvent<HTMLElement>) => {
    const state = dragState.current;
    if (
      !state.isDragging ||
      !containerRef.current ||
      event.pointerId !== state.pointerId ||
      !hasHorizontalOverflow()
    ) {
      return;
    }

    event.preventDefault();
    if (!state.didDrag && checkDragThreshold(event.pageX, event.pageY)) {
      containerRef.current.setPointerCapture(event.pointerId);
      state.didDrag = true;
    }

    const walk = event.pageX - state.startX;
    const prevScrollLeft = containerRef.current.scrollLeft;
    containerRef.current.scrollLeft = state.scrollLeft - walk;
    state.velX = containerRef.current.scrollLeft - prevScrollLeft;
  };

  return {
    props: {
      onPointerDown: handleDown,
      onPointerMove: handleMove,
      onLostPointerCapture: handleUp,
    },
    isDragging,
    didDrag: () => dragState.current.didDrag,
    hasOverflow: hasHorizontalOverflow,
  };
}
