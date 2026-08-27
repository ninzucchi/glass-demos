import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FollowUpPill } from "@/components/ui/FollowUpPill";
import { Icon } from "@/components/ui/Icon";
import { Tray, TrayHeader, TrayRow, TrayRows } from "@/components/ui/tray/Tray";
import { prStateColor, prStateIcon, pullRequestsFor } from "@/data/pullRequests";
import { AGENT_BOARD_STATUSES, agentsInProject, type Agent } from "@/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

type TrayKind = "prs" | "subagents";

const TRAY_MOTION = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
};

const isUnread = (status: Agent["status"]) => status !== "idle";

const STATUS_RANK: Record<Agent["status"], number> = Object.fromEntries(
  AGENT_BOARD_STATUSES.map((status, i) => [status, i]),
) as Record<Agent["status"], number>;

/** PRs + Subagents pills above the project composer. Open trays pin above
 *  the pill row, same width as the composer. */
export function ProjectFollowUp({
  project,
  tileId,
}: {
  project: Agent;
  tileId: string;
}) {
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const openAgentInTile = useWorkspaceStore((s) => s.openAgentInTile);
  const [open, setOpen] = useState<TrayKind | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const prs = pullRequestsFor(project.id);
  const subagents = [...agentsInProject(agents, agentOrder, project.id)].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
  );

  const showAgents = subagents.length > 0;
  const showPrs = prs.length > 0;
  const toggle = (kind: TrayKind) => setOpen((cur) => (cur === kind ? null : kind));

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

  if (!showAgents && !showPrs) return null;

  return (
    <div ref={hostRef} className="relative flex flex-col items-start gap-2">
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
                      label={agent.title}
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
