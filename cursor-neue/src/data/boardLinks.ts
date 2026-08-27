/** Canvas wires. `target` depends on `source` (sequence, stack, or parent). */

export const TASK_DEPENDS: Record<string, string | string[]> = {
  // Sidebar: chevron work, then keep it off the unread badge. Unread slot feeds the same child.
  "t-sb-4": ["t-sb-1", "t-sb-3"],
  // Keyboard: tab order, menu keyboard, focus chrome.
  "t-kb-6": "t-kb-1",
  "t-kb-4": "t-kb-2",
  "t-kb-9": "t-kb-7",
  // Base UI: menu family, dialogs, form controls, sidebar, create-dialog chrome.
  "t-bu-6": "t-bu-1",
  "t-bu-13": "t-bu-1",
  "t-bu-19": "t-bu-3",
  "t-bu-10": "t-bu-9",
  "t-bu-11": "t-bu-9",
  "t-bu-12": "t-bu-8",
  "t-bu-18": "t-bu-17",
};

export const PR_DEPENDS: Record<string, string | string[]> = {
  // Sidebar: unread badge stacks on the merged chevron layout.
  "pr-sb-3": "pr-sb-1",
  // Keyboard: trap stacks on escape; rings stack on focus restore.
  "pr-kb-2": "pr-kb-4",
  "pr-kb-6": "pr-kb-8",
  // Base UI: overlay stack, form stack, sidebar stack, menu stack.
  "pr-bu-6": "pr-bu-2",
  "pr-bu-3": "pr-bu-6",
  "pr-bu-9": "pr-bu-5",
  "pr-bu-10": "pr-bu-9",
  "pr-bu-12": "pr-bu-8",
  "pr-bu-13": "pr-bu-1",
};

/** Child agent → parent agent. Children wire to the parent, not the project hub. */
export const AGENT_PARENT: Record<string, string> = {
  "a-sb-4": "a-sb-1",
  "a-kb-6": "a-kb-1",
  "a-kb-5": "a-kb-2",
  "a-kb-8": "a-kb-3",
  "a-kb-9": "a-kb-7",
  "a-bu-6": "a-bu-1",
  "a-bu-13": "a-bu-1",
  "a-bu-19": "a-bu-3",
  "a-bu-4": "a-bu-5",
  "a-bu-10": "a-bu-9",
  "a-bu-11": "a-bu-9",
  "a-bu-12": "a-bu-8",
  "a-bu-17": "a-bu-7",
  "a-bu-14": "a-bu-18",
};

export function pairsFromDepends(
  map: Record<string, string | string[]>,
  present: Set<string>,
): { source: string; target: string }[] {
  const pairs: { source: string; target: string }[] = [];
  for (const [target, dep] of Object.entries(map)) {
    if (!present.has(target)) continue;
    const sources = Array.isArray(dep) ? dep : [dep];
    for (const source of sources) {
      if (present.has(source)) pairs.push({ source, target });
    }
  }
  return pairs;
}
