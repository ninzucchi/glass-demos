// The composer's expanded document: a Notion-style column of markdown/plain
// text blocks with drawing canvases embedded between them, in a centered modal.
// Rendered inline (no Portal) inside the window shell like CustomizeModal, so
// the scrim is clipped to the window.
//
// The document's text is mirrored into the agent's draft (see the store's
// setComposerDoc), so the small composer and the "1 Draft" pill stay in step.
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { CanvasBlock } from "@/components/chat/CanvasBlock";
import { useWindowId } from "@/components/window/WindowContext";
import {
  insertCanvas,
  removeBlock,
  replaceBlock,
  syncDocText,
  textBlock,
} from "@/lib/composerDoc";
import { useUiStore } from "@/store/useUiStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { ComposerBlock } from "@/types";

/** An auto-growing text block. Markdown is written as plain text — the surface
 *  is for drafting, so it stays unrendered. */
function TextBlock({
  block,
  first,
  onChange,
  onFocus,
}: {
  block: Extract<ComposerBlock, { kind: "text" }>;
  first: boolean;
  onChange: (text: string) => void;
  onFocus: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const autosize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(autosize, [block.text]);

  return (
    <textarea
      ref={ref}
      value={block.text}
      rows={1}
      autoFocus={first}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={first ? "Write, or insert a canvas…" : undefined}
      aria-label="Document text"
      className="w-full resize-none overflow-hidden bg-transparent text-lg leading-7 text-primary outline-none placeholder:text-quaternary"
    />
  );
}

export function ComposerSurface() {
  const windowId = useWindowId();
  const surface = useUiStore((s) => s.composerSurface);
  const close = useUiStore((s) => s.closeComposerSurface);
  const open = surface?.windowId === windowId;
  const agentId = surface?.agentId ?? "";

  const title = useWorkspaceStore((s) => (agentId ? s.agents[agentId]?.title : undefined));
  const draft = useWorkspaceStore((s) => (agentId ? s.drafts[agentId] ?? "" : ""));
  const blocks = useWorkspaceStore((s) => (agentId ? s.composerDoc[agentId] : undefined));
  const setComposerDoc = useWorkspaceStore((s) => s.setComposerDoc);

  // The small composer owns a plain string while the surface is closed, so fold
  // it into the document on open; from then on the document leads.
  useEffect(() => {
    if (!open || !agentId) return;
    const current = useWorkspaceStore.getState().composerDoc[agentId] ?? [textBlock()];
    setComposerDoc(agentId, syncDocText(current, draft));
    // Reconciles once per opening — later draft changes come from this surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentId]);

  const [focusedBlock, setFocusedBlock] = useState<string | null>(null);
  const doc = blocks ?? [textBlock()];
  const update = (next: ComposerBlock[]) => agentId && setComposerDoc(agentId, next);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Overlay data-no-drag className="absolute inset-0 z-modal bg-scrim" />
      <Dialog.Content
        data-no-drag
        aria-describedby={undefined}
        className="absolute left-1/2 top-1/2 z-modal flex h-[min(680px,86%)] w-[min(920px,88%)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--border-tertiary)] bg-elevated shadow-window outline-none"
      >
        <Dialog.Title className="sr-only">{title ?? "Composer"}</Dialog.Title>
        <div className="flex shrink-0 items-center justify-between gap-2 px-2 py-1.5">
          <button
            type="button"
            onClick={() => update(insertCanvas(doc, focusedBlock ?? undefined))}
            className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-base text-secondary hover:bg-tertiary hover:text-primary"
          >
            <Icon name="shapes-square-circle" size="base" color="tertiary" />
            Insert canvas
          </button>
          <Dialog.Close asChild>
            <IconButton name="arrows-contract" size="base" aria-label="Collapse composer" />
          </Dialog.Close>
        </div>

        {/* Prose keeps a reading measure; canvases bleed to the modal's edges,
            so each block owns its own width rather than a shared column. */}
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="flex flex-col gap-3 pb-16 pt-6">
            {doc.map((block, i) =>
              block.kind === "text" ? (
                <div key={block.id} className="mx-auto w-full max-w-[680px] px-10">
                  <TextBlock
                    block={block}
                    first={i === 0}
                    onFocus={() => setFocusedBlock(block.id)}
                    onChange={(text) => update(replaceBlock(doc, block.id, { ...block, text }))}
                  />
                </div>
              ) : (
                <CanvasBlock
                  key={block.id}
                  items={block.items}
                  onChange={(items) => update(replaceBlock(doc, block.id, { ...block, items }))}
                  onRemove={() => update(removeBlock(doc, block.id))}
                />
              ),
            )}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
