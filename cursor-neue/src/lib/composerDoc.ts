// The composer's expanded document: an ordered list of blocks, either markdown
// text or an embedded canvas. Pure helpers only — the store holds the blocks.
//
// Two surfaces edit the same content, so they split responsibility: the small
// composer owns a single string (the draft), while the document owns blocks.
// `syncDocText` reconciles them when the surface opens — a document that is
// still plain text is simply rebuilt from the draft; once it holds a canvas the
// document is the richer copy, so only its first text block takes the update.

import type { CanvasItem, ComposerBlock } from "@/types";

let counter = 0;

export function docId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export const textBlock = (text = ""): ComposerBlock => ({ id: docId("b"), kind: "text", text });

export const canvasBlock = (items: CanvasItem[] = []): ComposerBlock => ({
  id: docId("b"),
  kind: "canvas",
  items,
});

/** The document's plain text — what the small composer and the draft pill show. */
export const docToText = (blocks: ComposerBlock[]): string =>
  blocks
    .flatMap((b) => (b.kind === "text" && b.text.trim() ? [b.text] : []))
    .join("\n\n");

/** Fold an outside text edit into `blocks` (see the note at the top). */
export function syncDocText(blocks: ComposerBlock[], text: string): ComposerBlock[] {
  // The usual case: the draft is the text this document just produced, so it
  // carries no new edit. Rebuilding here would re-inline every text block's
  // content into the first one and duplicate it.
  if (docToText(blocks) === text) return blocks;

  const canvases = blocks.filter((b) => b.kind === "canvas");
  if (!canvases.length) return [textBlock(text)];
  // The small composer edited the joined text while the surface was closed, so
  // that string is now the document's prose; the canvases follow it.
  return [textBlock(text), ...canvases];
}

/** Replace one block, leaving the rest untouched. */
export const replaceBlock = (
  blocks: ComposerBlock[],
  id: string,
  next: ComposerBlock,
): ComposerBlock[] => blocks.map((b) => (b.id === id ? next : b));

/** Insert a canvas after `afterId` (or at the end), always leaving a text block
 *  behind it so there is somewhere to keep writing. */
export function insertCanvas(blocks: ComposerBlock[], afterId?: string): ComposerBlock[] {
  const at = afterId ? blocks.findIndex((b) => b.id === afterId) : blocks.length - 1;
  const head = blocks.slice(0, at + 1);
  const tail = blocks.slice(at + 1);
  const trailing = tail.length && tail[0].kind === "text" ? [] : [textBlock()];
  return [...head, canvasBlock(), ...trailing, ...tail];
}

/** Drop a block, collapsing the empty text blocks that would be left adjacent. */
export function removeBlock(blocks: ComposerBlock[], id: string): ComposerBlock[] {
  const next = blocks.filter((b) => b.id !== id);
  const pruned = next.filter(
    (b, i) =>
      !(b.kind === "text" && b.text === "" && next[i + 1]?.kind === "text" && i !== next.length - 1),
  );
  return pruned.length ? pruned : [textBlock()];
}
