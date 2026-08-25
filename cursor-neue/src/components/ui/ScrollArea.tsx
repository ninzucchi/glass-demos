import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

/** Same edge threshold as packages/ui ScrollArea — swallows sub-pixel rounding. */
const SCROLL_FADE_THRESHOLD_PX = 5;
const DEFAULT_FADE_PX = 24;

function computeScrollFadeState(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): { isAtTop: boolean; isAtBottom: boolean } {
  return {
    isAtTop: scrollTop <= SCROLL_FADE_THRESHOLD_PX,
    isAtBottom: scrollTop + clientHeight >= scrollHeight - SCROLL_FADE_THRESHOLD_PX,
  };
}

/**
 * Vertical scroller with the packages/ui ScrollArea edge-fade contract:
 * mask only the edges that still hide content. A list that fits fades on
 * neither edge. A fully scrolled edge shows in full.
 */
export function ScrollArea({
  children,
  className,
  contentClassName,
  topFadeSize = DEFAULT_FADE_PX,
  bottomFadeSize = DEFAULT_FADE_PX,
  topFadeStartOpacity = 0,
  bottomFadeStartOpacity = 0,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  topFadeSize?: number;
  bottomFadeSize?: number;
  topFadeStartOpacity?: number;
  bottomFadeStartOpacity?: number;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasContentAbove, setHasContentAbove] = useState(false);
  const [hasContentBelow, setHasContentBelow] = useState(false);

  const updateFade = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setHasContentAbove(false);
      setHasContentBelow(false);
      return;
    }
    const { isAtTop, isAtBottom } = computeScrollFadeState(
      viewport.scrollTop,
      viewport.scrollHeight,
      viewport.clientHeight,
    );
    setHasContentAbove(!isAtTop);
    setHasContentBelow(!isAtBottom);
  }, []);

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

  const topFade = hasContentAbove ? topFadeSize : 0;
  const bottomFade = hasContentBelow ? bottomFadeSize : 0;
  const mask =
    topFade > 0 || bottomFade > 0
      ? `linear-gradient(to bottom, rgba(0, 0, 0, ${topFadeStartOpacity}) 0px, black ${topFade}px, black calc(100% - ${bottomFade}px), rgba(0, 0, 0, ${bottomFadeStartOpacity}) 100%)`
      : undefined;

  return (
    <div
      data-sidebar-scroll=""
      className={clsx("relative grid min-h-0 grid-cols-1 grid-rows-1 overflow-hidden", className)}
    >
      <div
        ref={viewportRef}
        className="no-scrollbar min-h-0 overflow-y-auto overscroll-y-contain [grid-area:1/1]"
        style={
          mask
            ? { maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }
            : undefined
        }
      >
        <div ref={contentRef} className={clsx("flex min-h-full flex-col", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
