import { useMemo } from "react";
import { Composer } from "@/components/chat/Composer";
import { ProjectFollowUp } from "@/components/chat/ProjectFollowUp";
import { ProjectThreadHeader } from "@/components/chat/ProjectThreadHeader";
import { ThreadOriginPin } from "@/components/chat/ThreadOrigin";
import { FollowUpPill } from "@/components/ui/FollowUpPill";
import { isProject, type Agent, type Tab } from "@/types";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useWindowId } from "@/components/window/WindowContext";
import {
  useActiveAgent,
  useWorkspaceStore,
  type ThreadDisposition,
} from "@/store/useWorkspaceStore";

/** The shared transcript column: centered, capped at the chat reading width.
 *  The right padding grows by --island-inset (set on the window shell) so the
 *  floating pinned island never overlaps the text. */
const COLUMN = "mx-auto w-full max-w-[640px] pl-3 pr-[calc(12px+var(--island-inset,0px))]";

// Minimum tile width for "Reply in Thread" to split right; narrower tiles get
// the thread as a new tab instead (half of a narrower pane would be cramped).
const SPLIT_MIN_TILE_W = 560;

function CrumbBackPill() {
  const windowId = useWindowId();
  const crumbBack = useWorkspaceStore((s) => s.crumbBack);
  return <FollowUpPill onClick={() => crumbBack(windowId)}>Back</FollowUpPill>;
}

const threadDisposition = (tileId: string): ThreadDisposition => {
  const el = document.querySelector(`[data-tile-id="${tileId}"]`);
  return el && el.clientWidth >= SPLIT_MIN_TILE_W ? "right" : "tab";
};

/** Reply-count affordance under a message that spawned a thread: "1 Draft"
 *  while unsent composer text exists, "N Replies" once it has activity. Click
 *  focuses the thread's existing tab or reopens it beside this tile. */
function ReplyPill({ thread, tileId }: { thread: Agent; tileId: string }) {
  const openThread = useWorkspaceStore((s) => s.openThread);
  const count = thread.messages.length;
  const label = count === 0 ? "1 Draft" : count === 1 ? "1 Reply" : `${count} Replies`;
  return (
    <button
      type="button"
      onClick={() => openThread(tileId, thread.id, threadDisposition(tileId))}
      className="flex w-fit select-none items-center rounded-lg px-1.5 py-1 text-base text-secondary hover:bg-tertiary hover:text-primary"
    >
      {label}
    </button>
  );
}

export function ChatBody({ tab, tileId }: { tab: Tab; tileId: string }) {
  // Conversation lives on the tab's agent (shared globally), so mirrored tabs
  // of one agent show the same transcript and split tiles can show different
  // agents side by side. Tabs without an agent fall back to the active one.
  const tabAgent = useWorkspaceStore((s) => (tab.agentId ? s.agents[tab.agentId] : undefined));
  const activeAgent = useActiveAgent();
  const agent = tabAgent ?? activeAgent;
  const messages = agent?.messages ?? [];
  const crumbs = useFeatureFlags((s) => s.ephemeralTabs === "crumbs");
  const showCrumbBack = crumbs && !!agent && !isProject(agent) && !!agent.projectId;

  // Threads spawned from this conversation, grouped by source message index,
  // for the reply pills. A thread earns a pill once it has activity ("N
  // Replies") or unsent composer text ("1 Draft"); an empty thread with no
  // draft shows nothing.
  const agents = useWorkspaceStore((s) => s.agents);
  const drafts = useWorkspaceStore((s) => s.drafts);
  const threadsByMessage = useMemo(() => {
    const map = new Map<number, Agent[]>();
    if (!agent) return map;
    for (const a of Object.values(agents)) {
      if (a.thread?.parentAgentId !== agent.id) continue;
      const hasDraft = (drafts[a.id] ?? "").trim() !== "";
      if (a.messages.length === 0 && !hasDraft) continue;
      const list = map.get(a.thread.messageIndex) ?? [];
      list.push(a);
      map.set(a.thread.messageIndex, list);
    }
    return map;
  }, [agents, drafts, agent]);

  // Empty non-thread conversation (a freshly created agent): center the
  // expanded composer. An empty THREAD falls through to the standard layout —
  // origin pin on top, (empty) transcript, docked composer with the quote.
  // A project always shows its thread header, even with no messages yet.
  if (messages.length === 0 && !agent?.thread && !isProject(agent)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-chrome px-3">
        {showCrumbBack && <CrumbBackPill />}
        <Composer variant="expanded" agent={agent} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-chrome">
      {/* Pinned above the scroll area so the origin card stays visible while
          the thread transcript scrolls beneath it. */}
      {agent?.thread && (
        <div className={`${COLUMN} pt-2`}>
          <ThreadOriginPin agent={agent} />
        </div>
      )}
      <div className="flex-1 overflow-auto pb-4 pt-2">
        <div className={`${COLUMN} flex flex-col`}>
          {isProject(agent) && (
            <div className="my-12">
              <ProjectThreadHeader project={agent} />
            </div>
          )}
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => {
              const threads = threadsByMessage.get(i);
              const body =
                m.role === "user" ? (
                  // Ring (not border) so the 1px doesn't push text inward.
                  // Bubble hugs content up to 500px and sits on the right;
                  // copy stays left-aligned.
                  <div className="ml-auto w-fit max-w-[500px] rounded-2xl bg-elevated px-3.5 py-3 text-left text-lg text-primary shadow-[0_0_0_1px_var(--border-tertiary)]">
                    {m.text}
                  </div>
                ) : (
                  // Agent turn: optional tool line + message grouped with no gap; tool
                  // py-[3px] (6px total), message py-1. px-2.5 matches the bubble inset
                  // so every chat line shares one 22px left margin.
                  <div className="flex flex-col px-2.5">
                    {m.tool && <div className="py-[3px] text-lg text-tertiary">{m.tool}</div>}
                    <div className="py-1 text-lg text-primary">{m.text}</div>
                  </div>
                );
              if (!threads?.length) return <div key={i}>{body}</div>;
              return (
                <div key={i} className="flex flex-col gap-1">
                  {body}
                  <div className="flex flex-col gap-px px-1">
                    {threads.map((t) => (
                      <ReplyPill key={t.id} thread={t} tileId={tileId} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {agent && isProject(agent) && (
        <div className={`${COLUMN} pb-2`}>
          <ProjectFollowUp project={agent} tileId={tileId} />
        </div>
      )}
      {showCrumbBack && (
        <div className={`${COLUMN} pb-2`}>
          <CrumbBackPill />
        </div>
      )}
      <Composer agent={agent} />
    </div>
  );
}
