import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FollowUpPill } from "@/components/ui/FollowUpPill";
import { Icon } from "@/components/ui/Icon";
import { Tray, TrayHeader, TrayRow, TrayRows } from "@/components/ui/tray/Tray";
import {
  PR_TRAY_STATES,
  prStateColor,
  prStateIcon,
  pullRequestsFor,
} from "@/data/pullRequests";
import { AGENT_TRAY_STATUSES, agentsInProject, isWorkspace, type Agent } from "@/types";
import { agentDisplayTitle } from "@/lib/agentDisplayName";
import { workspaceBoardAgents, workspaceBoardPrs } from "@/lib/workspaceBoard";
import { useWindowId } from "@/components/window/WindowContext";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { useActiveContent, useWorkspaceStore } from "@/store/useWorkspaceStore";

type TrayKind = "prs" | "subagents";

const TRAY_MOTION = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
};

const isUnread = (status: Agent["status"]) => status !== "idle";

const AGENT_TRAY_RANK = Object.fromEntries(
  AGENT_TRAY_STATUSES.map((status, i) => [status, i]),
) as Record<Agent["status"], number>;

const PR_TRAY_RANK = Object.fromEntries(
  PR_TRAY_STATES.map((state, i) => [state, i]),
) as Record<(typeof PR_TRAY_STATES)[number], number>;

/** PRs + Subagents pills above the project composer. Open trays pin above
 *  the pill row, same width as the composer. */
export function ProjectFollowUp({
  project,
  tileId,
}: {
  project: Agent;
  tileId: string;
}) {
  const windowId = useWindowId();
  const contentOpen = useActiveContent().open;
  const openPinnedTab = useWorkspaceStore((s) => s.openPinnedTab);
  const openPrTab = useWorkspaceStore((s) => s.openPrTab);
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const openAgentInTile = useWorkspaceStore((s) => s.openAgentInTile);
  const open = useUiStore((s) => s.projectFollowUpTray);
  const setOpen = useUiStore((s) => s.setProjectFollowUpTray);
  const namesMode = useFeatureFlags((s) => s.agentNames);
  const hostRef = useRef<HTMLDivElement>(null);
  const showTracker = !contentOpen;

  const workspace = isWorkspace(project);
  const prs = [
    ...(workspace
      ? workspaceBoardPrs(agents, agentOrder, project.id)
      : pullRequestsFor(project.id)),
  ].sort((a, b) => PR_TRAY_RANK[a.state] - PR_TRAY_RANK[b.state]);
  const subagents = [
    ...(workspace
      ? workspaceBoardAgents(agents, agentOrder, project.id)
      : agentsInProject(agents, agentOrder, project.id)),
  ].sort((a, b) => AGENT_TRAY_RANK[a.status] - AGENT_TRAY_RANK[b.status]);

  const showAgents = subagents.length > 0;
  const showPrs = prs.length > 0;
  const toggle = (kind: TrayKind) => setOpen(open === kind ? null : kind);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!hostRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!showAgents && !showPrs && !showTracker && !open) return null;

  return (
    <div ref={hostRef} className="relative mb-2 flex flex-col items-start gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            key={open}
            className="absolute inset-x-0 bottom-full z-10 mb-2"
            initial={TRAY_MOTION.initial}
            animate={TRAY_MOTION.animate}
            exit={TRAY_MOTION.exit}
            transition={TRAY_MOTION.transition}
          >
            {open === "prs" ? (
              <Tray>
                <TrayHeader
                  title="Pull Requests"
                  trailing={<Icon name="dots-3-horizontal" size="sm" color="secondary" />}
                />
                <TrayRows>
                  {prs.map((item) => (
                    <TrayRow
                      key={item.id}
                      leading={
                        <Icon
                          name={prStateIcon(item.state)}
                          size="sm"
                          color="inherit"
                          style={{ color: prStateColor(item.state) }}
                        />
                      }
                      label={`#${item.number}`}
                      description={item.title}
                      onClick={() => {
                        openPrTab(windowId, item.id);
                        setOpen(null);
                      }}
                    />
                  ))}
                </TrayRows>
              </Tray>
            ) : (
              <Tray>
                <TrayHeader
                  title="Agents"
                  trailing={<Icon name="dots-3-horizontal" size="sm" color="secondary" />}
                />
                <TrayRows>
                  {subagents.map((agent) => (
                    <TrayRow
                      key={agent.id}
                      leading={
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: isUnread(agent.status)
                              ? "var(--icon-accent)"
                              : "var(--icon-quaternary)",
                          }}
                        />
                      }
                      label={agentDisplayTitle(agent, namesMode)}
                      onClick={() => {
                        openAgentInTile(agent.id, tileId, "tab");
                        setOpen(null);
                      }}
                    />
                  ))}
                </TrayRows>
              </Tray>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2">
        {showTracker && (
          <FollowUpPill onClick={() => openPinnedTab(windowId, "project")}>
            View Tracker
          </FollowUpPill>
        )}
        {showAgents && (
          <FollowUpPill
            count={subagents.length}
            selected={open === "subagents"}
            aria-expanded={open === "subagents"}
            onClick={() => toggle("subagents")}
          >
            Agents
          </FollowUpPill>
        )}
        {showPrs && (
          <FollowUpPill
            count={prs.length}
            selected={open === "prs"}
            aria-expanded={open === "prs"}
            onClick={() => toggle("prs")}
          >
            PRs
          </FollowUpPill>
        )}
      </div>
    </div>
  );
}
