import { Icon } from "@/components/ui/Icon";
import { isProject, type TileNode } from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Chat header in Crumbs mode: current title, or parent ▸ child. Parent and
 *  mouse-back pop to the project. */
export function ChatCrumbs({ tile }: { tile: TileNode }) {
  const windowId = useWindowId();
  const agents = useWorkspaceStore((s) => s.agents);
  const crumbBack = useWorkspaceStore((s) => s.crumbBack);
  const tab = tile.tabs.find((t) => t.id === tile.activeTabId);
  const agent = tab?.agentId ? agents[tab.agentId] : undefined;
  const parent = agent?.projectId ? agents[agent.projectId] : undefined;
  const parentProject = parent && isProject(parent) ? parent : undefined;

  if (!agent) return <div className="min-w-0 flex-1" />;

  return (
    <nav
      aria-label="Chat path"
      className="flex min-w-0 flex-1 items-center gap-1 py-2 pl-3 pr-2"
    >
      {parentProject && (
        <>
          <button
            type="button"
            onClick={() => crumbBack(windowId)}
            className="min-w-0 truncate text-base leading-[18px] text-secondary hover:underline"
          >
            {parentProject.title}
          </button>
          <Icon name="chevron-right" size="sm" color="quaternary" />
        </>
      )}
      <span className="min-w-0 truncate text-base leading-[18px] text-primary">
        {agent.title}
      </span>
    </nav>
  );
}
