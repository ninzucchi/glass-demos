import { OutlineButton } from "@/components/ui/OutlineButton";
import { ProjectBadge } from "@/components/chat/ProjectBadge";
import { agentsInProject, isWorkspace, type Agent } from "@/types";
import { pullRequestsFor } from "@/data/pullRequests";
import {
  workspaceActiveAgentCount,
  workspaceBoardPrs,
} from "@/lib/workspaceBoard";
import { useWindowId } from "@/components/window/WindowContext";
import { useActiveContent, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useUiStore } from "@/store/useUiStore";

/** Centered hero at the top of a project or workspace conversation. */
export function ProjectThreadHeader({ project }: { project: Agent }) {
  const workspace = isWorkspace(project);
  const color = workspace ? "default" : (project.color ?? "blue");
  const icon = workspace ? "folder" : (project.icon ?? "pencil");
  const windowId = useWindowId();
  const contentOpen = useActiveContent().open;
  const openPinnedTab = useWorkspaceStore((s) => s.openPinnedTab);
  const setContentOpen = useWorkspaceStore((s) => s.setContentOpen);
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const setFollowUpTray = useUiStore((s) => s.setProjectFollowUpTray);
  const agentCount = workspace
    ? workspaceActiveAgentCount(agents, agentOrder, project.id)
    : agentsInProject(agents, agentOrder, project.id).length;
  const prCount = workspace
    ? workspaceBoardPrs(agents, agentOrder, project.id).length
    : pullRequestsFor(project.id).length;

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <ProjectBadge color={color} icon={icon} />
      <div className="flex max-w-[322px] flex-col items-center gap-2">
        <p className="text-center text-3xl font-medium text-primary">{project.title}</p>
        <p className="text-center text-base text-tertiary">
          <button
            type="button"
            className="underline-offset-2 hover:text-primary hover:underline"
            onClick={() => setFollowUpTray("subagents")}
          >
            {agentCount} {workspace ? "Active" : "Agents"}
          </button>
          {" ∙ "}
          <button
            type="button"
            className="underline-offset-2 hover:text-primary hover:underline"
            onClick={() => setFollowUpTray("prs")}
          >
            {prCount} PRs
          </button>
        </p>
      </div>
      <OutlineButton
        aria-pressed={contentOpen}
        aria-label={contentOpen ? "Hide project tracker" : "Show project tracker"}
        onClick={() => {
          if (contentOpen) setContentOpen(windowId, false);
          else openPinnedTab(windowId, "project");
        }}
      >
        Project Tracker
      </OutlineButton>
    </div>
  );
}
