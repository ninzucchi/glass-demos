import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import clsx from "clsx";
import { useDragScroll } from "@/hooks/useDragScroll";

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

/** Same edge threshold as packages/ui ScrollArea — swallows sub-pixel rounding. */
const SCROLL_FADE_THRESHOLD_PX = 5;
const DEFAULT_FADE_PX = 24;

type ScrollOrientation = "vertical" | "horizontal";

function computeVerticalFadeState(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): { atStart: boolean; atEnd: boolean } {
  return {
    atStart: scrollTop <= SCROLL_FADE_THRESHOLD_PX,
    atEnd: scrollTop + clientHeight >= scrollHeight - SCROLL_FADE_THRESHOLD_PX,
  };
}

function computeHorizontalFadeState(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
): { atStart: boolean; atEnd: boolean } {
  return {
    atStart: scrollLeft <= SCROLL_FADE_THRESHOLD_PX,
    atEnd: scrollLeft + clientWidth >= scrollWidth - SCROLL_FADE_THRESHOLD_PX,
  };
}

/**
 * Scroller with the packages/ui ScrollArea edge-fade contract:
 * mask only the edges that still hide content. A list that fits fades on
 * neither edge. A fully scrolled edge shows in full.
 */
export function ScrollArea({
  children,
  className,
  contentClassName,
  orientation = "vertical",
  viewportRef: viewportRefProp,
  topFadeSize = DEFAULT_FADE_PX,
  bottomFadeSize = DEFAULT_FADE_PX,
  topFadeStartOpacity = 0,
  bottomFadeStartOpacity = 0,
  leftFadeSize = DEFAULT_FADE_PX,
  rightFadeSize = DEFAULT_FADE_PX,
  leftFadeStartOpacity = 0,
  rightFadeStartOpacity = 0,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  orientation?: ScrollOrientation;
  viewportRef?: Ref<HTMLDivElement>;
  topFadeSize?: number;
  bottomFadeSize?: number;
  topFadeStartOpacity?: number;
  bottomFadeStartOpacity?: number;
  leftFadeSize?: number;
  rightFadeSize?: number;
  leftFadeStartOpacity?: number;
  rightFadeStartOpacity?: number;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const setViewportRef = (node: HTMLDivElement | null) => {
    viewportRef.current = node;
    assignRef(viewportRefProp, node);
  };
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useDragScroll(viewportRef);
  const [hasContentBefore, setHasContentBefore] = useState(false);
  const [hasContentAfter, setHasContentAfter] = useState(false);

  const updateFade = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setHasContentBefore(false);
      setHasContentAfter(false);
      return;
    }
    let atStart: boolean;
    let atEnd: boolean;
    switch (orientation) {
      case "vertical":
        ({ atStart, atEnd } = computeVerticalFadeState(
          viewport.scrollTop,
          viewport.scrollHeight,
          viewport.clientHeight,
        ));
        break;
      case "horizontal":
        ({ atStart, atEnd } = computeHorizontalFadeState(
          viewport.scrollLeft,
          viewport.scrollWidth,
          viewport.clientWidth,
        ));
        break;
      default: {
        const _exhaustive: never = orientation;
        return _exhaustive;
      }
    }
    setHasContentBefore(!atStart);
    setHasContentAfter(!atEnd);
  }, [orientation]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport) return;
    const onScroll = () => updateFade();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateFade);
    ro.observe(viewport);
    if (content) ro.observe(content);
    updateFade();
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [updateFade]);

  let startFade = 0;
  let endFade = 0;
  let startOpacity = 0;
  let endOpacity = 0;
  let mask: string | undefined;
  switch (orientation) {
    case "vertical":
      startFade = hasContentBefore ? topFadeSize : 0;
      endFade = hasContentAfter ? bottomFadeSize : 0;
      startOpacity = topFadeStartOpacity;
      endOpacity = bottomFadeStartOpacity;
      mask =
        startFade > 0 || endFade > 0
          ? `linear-gradient(to bottom, rgba(0, 0, 0, ${startOpacity}) 0px, black ${startFade}px, black calc(100% - ${endFade}px), rgba(0, 0, 0, ${endOpacity}) 100%)`
          : undefined;
      break;
    case "horizontal":
      startFade = hasContentBefore ? leftFadeSize : 0;
      endFade = hasContentAfter ? rightFadeSize : 0;
      startOpacity = leftFadeStartOpacity;
      endOpacity = rightFadeStartOpacity;
      mask =
        startFade > 0 || endFade > 0
          ? `linear-gradient(to right, rgba(0, 0, 0, ${startOpacity}) 0px, black ${startFade}px, black calc(100% - ${endFade}px), rgba(0, 0, 0, ${endOpacity}) 100%)`
          : undefined;
      break;
    default: {
      const _exhaustive: never = orientation;
      return _exhaustive;
    }
  }

  return (
    <div
      data-sidebar-scroll=""
      className={clsx("relative grid min-h-0 grid-cols-1 grid-rows-1 overflow-hidden", className)}
    >
      <div
        ref={setViewportRef}
        className={
          orientation === "vertical"
            ? "no-scrollbar min-h-0 overflow-y-auto overscroll-y-contain [grid-area:1/1]"
            : clsx(
                "no-scrollbar min-w-0 overflow-x-auto overscroll-x-contain [grid-area:1/1]",
                drag.isDragging ? "cursor-grabbing select-none" : "cursor-grab",
              )
        }
        style={
          mask
            ? { maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }
            : undefined
        }
        {...(orientation === "horizontal" ? drag.props : undefined)}
      >
        <div
          ref={contentRef}
          className={clsx(
            orientation === "vertical" ? "flex min-h-full flex-col" : "flex w-max",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
