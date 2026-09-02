import { useMemo } from "react";
import type { PullRequest } from "@/data/pullRequests";
import { findTaskByFileName } from "@/data/taskFiles";
import { taskFileNameFromHref } from "@/data/tasksIndex";
import type { Task } from "@/data/tasks";
import { boardDocContent, type BoardDocSurface } from "@/lib/projectBoardDoc";
import type { Agent, ProjectColor } from "@/types";
import type { IconName } from "@/components/ui/Icon";
import { ProjectBadge } from "@/components/chat/ProjectBadge";
import { NotionEditorLocal } from "@/components/tiptap-templates/notion-like/notion-like-editor-local";
import { useWindowId } from "@/components/window/WindowContext";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Tracker document view: a live TipTap editor seeded from the active surface. */
export function ProjectBoardDoc({
  sourceKey,
  surface,
  projectId,
  projectTitle,
  projectBrief,
  projectIcon,
  projectColor,
  tasks,
  agents,
  prs,
}: {
  sourceKey: string;
  surface: BoardDocSurface;
  projectId?: string;
  projectTitle: string;
  projectBrief?: string;
  projectIcon?: IconName;
  projectColor?: ProjectColor;
  tasks: Task[];
  agents: Agent[];
  prs: PullRequest[];
}) {
  const windowId = useWindowId();
  const openBrowserTab = useWorkspaceStore((s) => s.openBrowserTab);
  const openContextFile = useWorkspaceStore((s) => s.openContextFile);
  const showIds = useFeatureFlags((s) => s.docIds) === "ids";
  const showNames = useFeatureFlags((s) => s.agentNames) === "names";
  const content = useMemo(
    () =>
      boardDocContent({
        surface,
        projectId,
        projectTitle,
        projectBrief,
        tasks,
        agents,
        prs,
        showIds,
        showNames,
      }),
    [agents, prs, projectBrief, projectId, projectTitle, showIds, showNames, surface, tasks],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <NotionEditorLocal
        content={content}
        sourceKey={`${sourceKey}-${showIds ? "ids" : "off"}-${showNames ? "names" : "off"}-strike-name`}
        onLinkClick={(href) => {
          const name = taskFileNameFromHref(href);
          const target = name ? findTaskByFileName(name) : undefined;
          if (target) {
            openContextFile(windowId, target.projectId, target.task.id);
            return;
          }
          openBrowserTab(windowId, href);
        }}
        cover={
          <ProjectBadge
            size={48}
            icon={projectIcon ?? "pencil"}
            color={projectColor ?? "default"}
          />
        }
      />
    </div>
  );
}
