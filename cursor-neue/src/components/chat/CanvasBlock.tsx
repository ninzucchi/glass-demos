// A drawing canvas embedded in the composer document, like an image block.
//
// Layering matters: strokes and connectors live in one SVG behind the boxes, so
// a spline drawn between two shape centers is hidden by the shapes themselves
// and reads as joining their edges.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import { IconButton } from "@/components/ui/IconButton";
import { docId } from "@/lib/composerDoc";
import { lockDragSelection } from "@/lib/dragGuard";
import { isCanvasBox, type CanvasAnchor, type CanvasBox, type CanvasItem } from "@/types";

export const CANVAS_HEIGHT = 320;

type Tool = "select" | "rect" | "circle" | "text" | "pencil";

const TOOLS: { tool: Tool; icon: "pointer-arrow" | "square" | "circle" | "text-aa" | "pencil"; label: string }[] = [
  { tool: "select", icon: "pointer-arrow", label: "Select" },
  { tool: "rect", icon: "square", label: "Rectangle" },
  { tool: "circle", icon: "circle", label: "Circle" },
  { tool: "text", icon: "text-aa", label: "Text" },
  { tool: "pencil", icon: "pencil", label: "Pencil" },
];

const NEW_BOX: Record<"rect" | "circle" | "text", { w: number; h: number }> = {
  rect: { w: 150, h: 90 },
  circle: { w: 110, h: 110 },
  text: { w: 160, h: 32 },
};

/** Edge attachment points, clockwise from the top. */
const nodesOf = (box: CanvasBox) => [
  { x: box.x + box.w / 2, y: box.y },
  { x: box.x + box.w, y: box.y + box.h / 2 },
  { x: box.x + box.w / 2, y: box.y + box.h },
  { x: box.x, y: box.y + box.h / 2 },
];

/** Outward direction of each node, so a connector leaves the box facing away
 *  from the side it is pinned to. */
const NODE_DIR = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

type Point = { x: number; y: number };

const nodeAt = (box: CanvasBox, node: number) => nodesOf(box)[node] ?? nodesOf(box)[0];

/** Index of the node closest to `p` — the end the user dropped nearest. */
const nearestNode = (box: CanvasBox, p: Point): number =>
  nodesOf(box).reduce(
    (best, node, i, all) =>
      Math.hypot(node.x - p.x, node.y - p.y) < Math.hypot(all[best].x - p.x, all[best].y - p.y)
        ? i
        : best,
    0,
  );

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

/** Pointer travel that separates a click from a drag. */
const DRAG_MIN = 4;

/** Cubic leaving each end along its node's outward direction. `toDir` is null
 *  for the in-flight preview, whose free end has no side yet. */
function spline(a: Point, fromDir: Point, b: Point, toDir: Point | null): string {
  // Capped so long connectors arc gently instead of ballooning off-canvas.
  const bow = clamp(Math.hypot(b.x - a.x, b.y - a.y) * 0.35, 24, 80);
  const c1 = { x: a.x + fromDir.x * bow, y: a.y + fromDir.y * bow };
  const c2 = toDir ? { x: b.x + toDir.x * bow, y: b.y + toDir.y * bow } : b;
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

const strokePath = (points: { x: number; y: number }[]): string =>
  points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");

/** Track a pointer drag to release, with text selection suppressed throughout. */
function trackPointer(onMove: (e: PointerEvent) => void, onEnd: (e: PointerEvent) => void): void {
  const release = lockDragSelection();
  const up = (e: PointerEvent) => {
    release();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", up);
    onEnd(e);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", up);
}

export function CanvasBlock({
  items,
  onChange,
  onRemove,
}: {
  items: CanvasItem[];
  onChange: (items: CanvasItem[]) => void;
  onRemove: () => void;
}) {
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  // In-flight gestures, drawn as previews until the pointer is released.
  const [draft, setDraft] = useState<CanvasItem | null>(null);
  const [link, setLink] = useState<{ from: CanvasAnchor; at: Point } | null>(null);
  // A text box created by the text tool takes the caret once it has rendered.
  const [focusItem, setFocusItem] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const boxes = items.filter(isCanvasBox);
  const boxById = (id: string) => boxes.find((b) => b.id === id);

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return rect
      ? { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height }
      : { x: 0, y: 0, w: 0, h: 0 };
  };

  useEffect(() => {
    if (!focusItem) return;
    surfaceRef.current?.querySelector<HTMLTextAreaElement>(`[data-text="${focusItem}"]`)?.focus();
    setFocusItem(null);
  }, [focusItem, items]);

  // Delete removes the selection (and any connectors that hung off it), unless
  // the user is typing in a text item.
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("textarea, input, [contenteditable]")) return;
      e.preventDefault();
      onChange(
        items.filter(
          (i) =>
            i.id !== selected &&
            !(i.kind === "edge" && (i.from.id === selected || i.to.id === selected)),
        ),
      );
      setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, items, onChange]);

  /** Pointer down on empty canvas: draw with the active tool. */
  const beginOnSurface = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const start = local(e);
    setSelected(null);
    if (tool === "select") return;
    e.preventDefault();

    if (tool === "pencil") {
      const points = [{ x: start.x, y: start.y }];
      const stroke: CanvasItem = { id: docId("s"), kind: "stroke", points };
      setDraft(stroke);
      trackPointer(
        (ev) => {
          const p = local(ev);
          points.push({ x: clamp(p.x, 0, start.w), y: clamp(p.y, 0, start.h) });
          setDraft({ ...stroke, points: [...points] });
        },
        () => {
          setDraft(null);
          if (points.length > 1) onChange([...items, { ...stroke, points }]);
        },
      );
      return;
    }

    // Shapes and text are one gesture with two outcomes: a click drops a
    // default-size box centered on the point, a drag sizes it corner to corner.
    // Nothing previews until the pointer clears DRAG_MIN, so a plain click
    // never flashes the default box on its way to the same result.
    const kind = tool;
    const boxAt = (to: Point, dragging: boolean): CanvasBox => {
      const size = dragging
        ? { w: Math.abs(to.x - start.x), h: Math.abs(to.y - start.y) }
        : NEW_BOX[kind];
      const origin = dragging
        ? { x: Math.min(start.x, to.x), y: Math.min(start.y, to.y) }
        : { x: start.x - size.w / 2, y: start.y - size.h / 2 };
      const base = {
        id: "draft",
        x: clamp(origin.x, 0, start.w - size.w),
        y: clamp(origin.y, 0, start.h - size.h),
        ...size,
      };
      return kind === "text" ? { ...base, kind: "text", text: "" } : { ...base, kind };
    };

    let dragging = false;
    trackPointer(
      (ev) => {
        const p = local(ev);
        dragging ||= Math.hypot(p.x - start.x, p.y - start.y) > DRAG_MIN;
        if (dragging) setDraft(boxAt(p, true));
      },
      (ev) => {
        setDraft(null);
        const box = { ...boxAt(local(ev), dragging), id: docId(kind[0]) };
        onChange([...items, box]);
        setSelected(box.id);
        setTool("select");
        if (box.kind === "text") setFocusItem(box.id);
      },
    );
  };

  /** Pointer down on a box: move it (select tool only). */
  const beginMove = (box: CanvasBox) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setSelected(box.id);
    if (tool !== "select") return;
    e.stopPropagation();
    const start = local(e);
    const grabX = start.x - box.x;
    const grabY = start.y - box.y;
    let moved = false;
    trackPointer(
      (ev) => {
        const p = local(ev);
        moved = true;
        onChange(
          items.map((i) =>
            i.id === box.id && isCanvasBox(i)
              ? {
                  ...i,
                  x: clamp(p.x - grabX, 0, start.w - box.w),
                  y: clamp(p.y - grabY, 0, start.h - box.h),
                }
              : i,
          ),
        );
      },
      () => {
        // A click (no movement) on a text box hands over to its editor.
        if (!moved && box.kind === "text") {
          surfaceRef.current?.querySelector<HTMLTextAreaElement>(`[data-text="${box.id}"]`)?.focus();
        }
      },
    );
  };

  /** Pointer down on a hover node: drag a connector from that node to another
   *  box, landing on whichever of its nodes is nearest the drop. */
  const beginLink = (box: CanvasBox, node: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const at = local(e);
    setLink({ from: { id: box.id, node }, at: { x: at.x, y: at.y } });
    trackPointer(
      (ev) => {
        const p = local(ev);
        setLink({ from: { id: box.id, node }, at: { x: p.x, y: p.y } });
      },
      (ev) => {
        setLink(null);
        const p = local(ev);
        const target = [...boxes]
          .reverse()
          .find(
            (b) =>
              b.id !== box.id && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h,
          );
        if (!target) return;
        const to = { id: target.id, node: nearestNode(target, p) };
        const exists = items.some(
          (i) =>
            i.kind === "edge" &&
            i.from.id === box.id &&
            i.from.node === node &&
            i.to.id === to.id &&
            i.to.node === to.node,
        );
        if (!exists) {
          onChange([
            ...items,
            { id: docId("e"), kind: "edge", from: { id: box.id, node }, to },
          ]);
        }
      },
    );
  };

  const previewBox = draft && isCanvasBox(draft) ? draft : null;
  const previewStroke = draft?.kind === "stroke" ? draft : null;

  return (
    <div className="overflow-hidden border-y border-secondary bg-editor">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-quaternary)] px-1.5 py-1">
        <div className="flex items-center gap-0.5">
          {TOOLS.map((t) => (
            <IconButton
              key={t.tool}
              name={t.icon}
              size="base"
              aria-label={t.label}
              aria-pressed={tool === t.tool}
              active={tool === t.tool}
              onClick={() => setTool(t.tool)}
              className={clsx(tool === t.tool && "bg-tertiary")}
            />
          ))}
        </div>
        <IconButton name="trash" size="base" aria-label="Delete canvas" onClick={onRemove} />
      </div>

      <div
        ref={surfaceRef}
        onPointerDown={beginOnSurface}
        className={clsx(
          "relative",
          tool === "select" ? "cursor-default" : tool === "pencil" ? "cursor-crosshair" : "cursor-copy",
        )}
        style={{ height: CANVAS_HEIGHT }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {items.map((item) => {
            if (item.kind === "edge") {
              const from = boxById(item.from.id);
              const to = boxById(item.to.id);
              if (!from || !to) return null;
              return (
                <path
                  key={item.id}
                  d={spline(
                    nodeAt(from, item.from.node),
                    NODE_DIR[item.from.node],
                    nodeAt(to, item.to.node),
                    NODE_DIR[item.to.node],
                  )}
                  fill="none"
                  stroke="var(--icon-tertiary)"
                  strokeWidth={1.5}
                />
              );
            }
            if (item.kind !== "stroke") return null;
            return (
              <path
                key={item.id}
                d={strokePath(item.points)}
                fill="none"
                stroke="var(--icon-primary)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {previewStroke && (
            <path
              d={strokePath(previewStroke.points)}
              fill="none"
              stroke="var(--icon-primary)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {(() => {
            const from = link && boxById(link.from.id);
            return link && from ? (
              <path
                d={spline(nodeAt(from, link.from.node), NODE_DIR[link.from.node], link.at, null)}
                fill="none"
                stroke="var(--icon-accent)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            ) : null;
          })()}
        </svg>

        {boxes.map((box) => (
          <div
            key={box.id}
            onPointerDown={beginMove(box)}
            onPointerEnter={() => setHovered(box.id)}
            onPointerLeave={() => setHovered((h) => (h === box.id ? null : h))}
            className={clsx(
              "absolute",
              tool === "select" && "cursor-grab active:cursor-grabbing",
              box.kind !== "text" && "border border-accent bg-[var(--bg-accent-tertiary)]",
              box.kind === "circle" && "rounded-full",
              box.kind === "rect" && "rounded-xl",
              selected === box.id && "outline outline-2 outline-offset-2 outline-[var(--bg-accent)]",
            )}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          >
            {box.kind === "text" && (
              <textarea
                data-text={box.id}
                value={box.text}
                placeholder="Text"
                onChange={(e) =>
                  onChange(
                    items.map((i) =>
                      i.id === box.id && i.kind === "text" ? { ...i, text: e.target.value } : i,
                    ),
                  )
                }
                className="h-full w-full resize-none bg-transparent text-base leading-tight text-primary outline-none placeholder:text-quaternary"
              />
            )}
            {/* Connector handles: hover a box in select mode to reveal them. */}
            {tool === "select" &&
              (hovered === box.id || link?.from.id === box.id) &&
              nodesOf(box).map((node, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Connect from ${box.kind}`}
                  onPointerDown={beginLink(box, i)}
                  className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--bg-accent)] bg-editor hover:scale-125"
                  style={{ left: node.x - box.x, top: node.y - box.y }}
                />
              ))}
          </div>
        ))}

        {previewBox && (
          <div
            aria-hidden
            className={clsx(
              "pointer-events-none absolute border border-dashed border-accent bg-[var(--bg-accent-quaternary)]",
              previewBox.kind === "circle" ? "rounded-full" : "rounded-xl",
            )}
            style={{
              left: previewBox.x,
              top: previewBox.y,
              width: previewBox.w,
              height: previewBox.h,
            }}
          />
        )}
      </div>
    </div>
  );
}
