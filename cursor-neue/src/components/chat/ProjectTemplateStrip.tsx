import { ProjectTemplateCard } from "@/components/sidebar/ProjectTemplateCard";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useWindowId } from "@/components/window/WindowContext";
import {
  PROJECT_SUGGESTIONS,
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/data/projectTemplates";
import { DEFAULT_WORKSPACE_ID, type Agent } from "@/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const TEMPLATES = [...PROJECT_SUGGESTIONS, ...PROJECT_TEMPLATES];
const FADE_PX = 64;

/** Horizontal template rail. Composer and Advanced create share this. */
export function ProjectTemplateRail({
  onPick,
}: {
  onPick: (item: ProjectTemplate) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[940px] flex-col gap-2 pb-5 pl-5">
      <span className="text-sm font-medium text-secondary">Start from a template</span>
      <ScrollArea
        orientation="horizontal"
        className="w-full"
        leftFadeSize={FADE_PX}
        rightFadeSize={FADE_PX}
      >
        <div className="flex w-max gap-1.5 pr-5">
          {TEMPLATES.map((item) => (
            <ProjectTemplateCard
              key={item.id}
              item={item}
              surface="elevated"
              onPick={() => onPick(item)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/** Bottom template rail on the New Project composer screen. */
export function ProjectTemplateStrip({ agent }: { agent: Agent }) {
  const windowId = useWindowId();
  const createProject = useWorkspaceStore((s) => s.createProject);
  const archiveAgent = useWorkspaceStore((s) => s.archiveAgent);

  const pick = (template: ProjectTemplate) => {
    const workspaceId = agent.workspaceIds[0] ?? DEFAULT_WORKSPACE_ID;
    const draftId = agent.id;
    createProject(windowId, {
      title: template.title,
      workspaceId,
      icon: template.icon,
      color: template.color,
      description: template.description,
      agents: template.agents,
    });
    archiveAgent(draftId);
  };

  return <ProjectTemplateRail onPick={pick} />;
}
