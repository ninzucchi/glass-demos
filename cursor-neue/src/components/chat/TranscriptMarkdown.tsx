import { parseTranscriptMarkdown, type TranscriptBlock } from "@/lib/transcriptMarkdown";

/** Transcript body: 15px / 22px. Use length tokens so Tailwind does not skip the size. */
export const TRANSCRIPT_TYPE =
  "text-[length:var(--font-size-chat)] leading-[var(--line-height-chat)]";

const LIST =
  "my-4 list-outside space-y-2 pl-[1.4em] marker:text-secondary";

function TranscriptBlockView({ block }: { block: TranscriptBlock }) {
  switch (block.type) {
    case "p":
      return <p className="m-0 [&+p]:mt-1.5">{block.text}</p>;
    case "ol":
      return (
        <ol className={`list-decimal ${LIST}`}>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "ul":
      return (
        <ul className={`list-disc ${LIST}`}>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

/** Agent (and user) reply body: markdown in, semantic blocks out. */
export function TranscriptMarkdown({ text }: { text: string }) {
  const blocks = parseTranscriptMarkdown(text);
  if (blocks.length === 0) return null;
  return (
    <div className={`text-primary ${TRANSCRIPT_TYPE}`}>
      {blocks.map((block, i) => (
        <TranscriptBlockView key={i} block={block} />
      ))}
    </div>
  );
}
