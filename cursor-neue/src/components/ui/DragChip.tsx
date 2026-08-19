import type { ReactNode } from "react";

/** Floating chip that follows the cursor during a pointer drag. Rendered once at
 *  the app root; fixed + pointer-events-none so it never interferes with
 *  hit-testing underneath. Shares the menu's elevated surface so it floats above. */
export function DragChip({
  pointer,
  children,
}: {
  pointer: { x: number; y: number };
  children: ReactNode;
}) {
  return (
    <>
      {/* Transparent full-viewport scrim that catches the pointer while dragging
          so list cells, dock tiles, etc. beneath the cursor don't fire their
          hover states. Hit-testing (targetAtPoint / isOutsideWindows) looks past
          it via the [data-drag-scrim] marker, so drops still resolve normally. */}
      <div data-drag-scrim className="fixed inset-0 z-[998]" style={{ cursor: "inherit" }} />
      <div
        className="pointer-events-none fixed z-[999] flex max-w-[240px] flex-col rounded-lg bg-elevated text-primary shadow-xl"
        style={{ left: pointer.x + 12, top: pointer.y + 10 }}
      >
        {children}
      </div>
    </>
  );
}
