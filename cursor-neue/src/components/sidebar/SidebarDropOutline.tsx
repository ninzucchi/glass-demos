import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

const DROP_OUTLINE_PAD = 4;

/** Outline portaled to the sidebar scroll clip. The 4px pad can extend past a
 *  section without the window-level z-997 layer covering Search / New Agent /
 *  Inbox / Customize. */
export function SidebarDropOutline({
  hostRef,
  active,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  active: boolean;
}) {
  const [clip, setClip] = useState<Element | null>(null);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const nextClip = host?.closest("[data-sidebar-scroll]") ?? null;
    if (!active || !host || !nextClip) {
      setBox(null);
      setClip(null);
      return;
    }
    setClip(nextClip);
    const update = () => {
      const r = host.getBoundingClientRect();
      const c = nextClip.getBoundingClientRect();
      setBox({
        top: r.top - c.top,
        left: r.left - c.left,
        width: r.width,
        height: r.height,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    ro.observe(nextClip);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, hostRef]);

  if (!active || !box || !clip) return null;
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 rounded-lg border-[1.5px] border-accent"
      style={{
        top: box.top - DROP_OUTLINE_PAD,
        left: box.left - DROP_OUTLINE_PAD,
        width: box.width + DROP_OUTLINE_PAD * 2,
        height: box.height + DROP_OUTLINE_PAD * 2,
      }}
    />,
    clip,
  );
}
