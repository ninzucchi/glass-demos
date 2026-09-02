export type TranscriptBlock =
  | { type: "p"; text: string }
  | { type: "ol"; items: string[] }
  | { type: "ul"; items: string[] };

const ORDERED = /^(?:\d+)[.)]\s+(.*)$/;
const UNORDERED = /^[-*+]\s+(.*)$/;

/** Turn a seeded agent reply into paragraphs and lists. Keep the source as
 *  markdown — do not store HTML on the message. */
export function parseTranscriptMarkdown(source: string): TranscriptBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: TranscriptBlock[] = [];
  let current: TranscriptBlock | null = null;

  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim() === "") {
      flush();
      continue;
    }

    const ordered = line.match(ORDERED);
    if (ordered) {
      if (current?.type === "ol") current.items.push(ordered[1] ?? "");
      else {
        flush();
        current = { type: "ol", items: [ordered[1] ?? ""] };
      }
      continue;
    }

    const unordered = line.match(UNORDERED);
    if (unordered) {
      if (current?.type === "ul") current.items.push(unordered[1] ?? "");
      else {
        flush();
        current = { type: "ul", items: [unordered[1] ?? ""] };
      }
      continue;
    }

    if (current?.type === "p") {
      current.text = `${current.text} ${line}`;
    } else {
      flush();
      current = { type: "p", text: line };
    }
  }

  flush();
  return blocks;
}
