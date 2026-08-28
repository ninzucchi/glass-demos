// The thread origin pin links a thread back to its originating chat: show
// the parent agent's status dot (sidebar read/unread coloring), swap it for
// an up-left arrow on hover, and activate the parent on click.

import { Icon } from "@/components/ui/Icon";
import type { Agent } from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** The thread's parent agent + an action to jump back to it. */
function useThreadOrigin(agent: Agent): { parent: Agent | undefined; open: () => void } {
  const windowId = useWindowId();
  const parent = useWorkspaceStore((s) =>
    agent.thread ? s.agents[agent.thread.parentAgentId] : undefined,
  );
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  return { parent, open: () => parent && setActiveAgent(windowId, parent.id) };
}

/** Status dot that becomes an up-left "go to origin" arrow while the enclosing
 *  `group/origin` element is hovered. Read/unread mirrors the sidebar model:
 *  idle = read (quaternary), anything else unread (accent). */
function OriginGlyph({ parent, boxClass }: { parent?: Agent; boxClass: string }) {
  const unread = parent && parent.status !== "idle";
  return (
    <span className={`flex shrink-0 items-center justify-center ${boxClass}`}>
      <span
        className="h-1.5 w-1.5 rounded-full group-hover/origin:hidden"
        style={{ background: unread ? "var(--icon-accent)" : "var(--icon-quaternary)" }}
      />
      <Icon
        name="arrow-left-up"
        size="base"
        color="secondary"
        className="hidden group-hover/origin:flex"
      />
    </span>
  );
}

const DELETED_PARENT = "Deleted chat";

/** Pinned card at the top of a thread: glyph + the originating chat's title,
 *  styled like a user bubble. */
export function ThreadOriginPin({ agent }: { agent: Agent }) {
  const { parent, open } = useThreadOrigin(agent);
  if (!agent.thread) return null;
  return (
    <button
      type="button"
      onClick={open}
      disabled={!parent}
      className="group/origin flex w-full items-center gap-1 rounded-2xl bg-elevated px-2.5 py-2 text-left text-lg text-primary shadow-[0_0_0_1px_var(--border-tertiary)]"
    >
      <OriginGlyph parent={parent} boxClass="w-5" />
      <span className="min-w-0 truncate">{parent?.title ?? DELETED_PARENT}</span>
    </button>
  );
}
