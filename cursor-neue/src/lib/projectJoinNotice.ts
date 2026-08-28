const COUNT_WORD = [
  "",
  "A",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
] as const;

/** Header in the project transcript after agents join. */
export function projectJoinDividerText(count: number): string {
  return count === 1 ? "Added 1 agent" : `Added ${count} agents`;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function countLead(count: number): string {
  if (count === 1) return "A new agent joined";
  const word = COUNT_WORD[count];
  return word ? `${word} new agents joined` : `${count} new agents joined`;
}

/** Project-agent reply after a join. */
export function projectJoinReplyText(names: string[]): string {
  const lead = countLead(names.length);
  return `${lead} the project, ${joinNames(names)}. I'll manage their tasks and coordinate efforts going forward.`;
}

export const JOIN_PULSE_MS = 2500;
