import { useTabDragStore } from "@/store/tabDrag";

/** Drop preview shown over a window whose content pane is closed (chat fills it)
 *  while a tab is dragged onto it. Releasing opens the content pane and appends
 *  the tab. Highlights the right half — where the content pane will open beside
 *  the chat — mirroring the chat|content split. Scoped to its window + scope so
 *  only the targeted window highlights. Pointer-events none: hit-testing + the
 *  drop are driven from TabHandle. */
export function OpenContentDropZone({ windowId, scopeId }: { windowId: string; scopeId: string }) {
  const active = useTabDragStore(
    (s) => s.target?.scope === "open" && s.target.windowId === windowId && s.target.scopeId === scopeId,
  );
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 left-1/2 z-40 p-2">
      <div className="dropzone-fill h-full w-full rounded-lg border-[1.5px] border-accent" />
    </div>
  );
}
