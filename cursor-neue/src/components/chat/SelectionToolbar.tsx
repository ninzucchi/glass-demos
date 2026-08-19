import { useEffect, useState } from "react";
import type { RefObject } from "react";

export interface MessageSelection {
  messageIndex: number;
  text: string;
  /** Viewport coords: horizontal center + top edge of the selection rect. */
  x: number;
  y: number;
}

/** Live text selection within `containerRef`, resolved to the chat message it
 *  started in (via the nearest `[data-msg-index]` ancestor). Null while the
 *  selection is collapsed, empty, or outside the transcript. Tracks
 *  selectionchange + scroll so the anchor point stays glued to the text. */
export function useMessageSelection(containerRef: RefObject<HTMLElement>): MessageSelection | null {
  const [selection, setSelection] = useState<MessageSelection | null>(null);

  useEffect(() => {
    const read = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return setSelection(null);
      const text = sel.toString().trim();
      if (!text) return setSelection(null);
      const anchor =
        sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
      const msgEl = anchor?.closest("[data-msg-index]");
      const container = containerRef.current;
      if (!msgEl || !container || !container.contains(msgEl)) return setSelection(null);
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSelection({
        messageIndex: Number(msgEl.getAttribute("data-msg-index")),
        text,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    };
    document.addEventListener("selectionchange", read);
    window.addEventListener("scroll", read, true);
    return () => {
      document.removeEventListener("selectionchange", read);
      window.removeEventListener("scroll", read, true);
    };
  }, [containerRef]);

  return selection;
}

/** Floating "Reply in Thread" menu anchored above a text selection. Fixed
 *  positioning (like DragChip) so it floats over the transcript without
 *  affecting layout. mousedown is swallowed so clicking the button doesn't
 *  collapse the selection before the action reads it. */
export function SelectionToolbar({
  selection,
  onReply,
}: {
  selection: MessageSelection;
  onReply: (selection: MessageSelection) => void;
}) {
  return (
    <div
      className="fixed z-menu -translate-x-1/2 -translate-y-full pb-1.5"
      style={{ left: selection.x, top: selection.y }}
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onReply(selection)}
        className="flex min-h-[26px] cursor-default select-none items-center rounded-lg bg-elevated px-2 py-1 text-base text-secondary shadow-popover hover:text-primary"
      >
        Reply in Thread
      </button>
    </div>
  );
}
