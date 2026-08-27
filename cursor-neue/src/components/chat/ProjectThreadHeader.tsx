import { OutlineButton } from "@/components/ui/OutlineButton";
import { ProjectBadge } from "@/components/chat/ProjectBadge";
import type { Agent } from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Centered hero at the top of a project's conversation. 80px color badge,
 *  title, optional description, and a large outline action. */
export function ProjectThreadHeader({ project }: { project: Agent }) {
  const color = project.color ?? "blue";
  const icon = project.icon ?? "pencil";
  const windowId = useWindowId();
  const openPinnedTab = useWorkspaceStore((s) => s.openPinnedTab);

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <ProjectBadge color={color} icon={icon} />
      <div className="flex max-w-[322px] flex-col items-center gap-2">
        <p className="text-center text-3xl font-medium text-primary">{project.title}</p>
        {project.description && (
          <p className="text-center text-base text-tertiary">{project.description}</p>
        )}
      </div>
      <OutlineButton onClick={() => openPinnedTab(windowId, "project")}>
        Project Overview
      </OutlineButton>
    </div>
  );
}
