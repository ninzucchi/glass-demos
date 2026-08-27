import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { agentsInProject, isProject, type Agent, type TileNode } from "@/types";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Project that owns this chat strip: the active tab, the first tab, or the
 *  parent of a child agent opened from this bar. */
function projectForTile(
  tile: TileNode,
  agents: Record<string, Agent>,
): Agent | undefined {
  const tabs = [tile.tabs.find((t) => t.id === tile.activeTabId), tile.tabs[0]];
  for (const tab of tabs) {
    const agent = tab?.agentId ? agents[tab.agentId] : undefined;
    if (!agent) continue;
    if (isProject(agent)) return agent;
    if (agent.projectId) {
      const parent = agents[agent.projectId];
      if (parent && isProject(parent)) return parent;
    }
  }
  return undefined;
}

const isUnread = (status: Agent["status"]) => status !== "idle";

const ROW = "h-[30px] min-h-[30px] rounded-lg";

/** Plus on the chat tab bar when project folders are Compressed and this
 *  strip is a project. Opens a searchable list of that project's agents. */
export function ProjectAgentsMenu({ tile }: { tile: TileNode }) {
  const foldersCompressed = useFeatureFlags((s) => s.projectFolders) === "compressed";
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const openAgentInTile = useWorkspaceStore((s) => s.openAgentInTile);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const project = projectForTile(tile, agents);
  const children = useMemo(
    () => (project ? agentsInProject(agents, agentOrder, project.id) : []),
    [agents, agentOrder, project],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return children;
    return children.filter((a) => a.title.toLowerCase().includes(q));
  }, [children, query]);

  if (!foldersCompressed || !project) return null;

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuTrigger asChild>
        <IconButton name="plus" size="lg" aria-label="Open project agent" className="mx-1 self-center" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[260px] !rounded-xl p-1.5"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className={`flex items-center gap-2 px-1.5 ${ROW}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <Icon name="magnifying-glass" size="base" color="tertiary" />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents"
            aria-label="Search agents"
            className="w-full bg-transparent text-base text-primary outline-none placeholder:text-quaternary"
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <DropdownMenuSeparator className="my-1.5" />
        {filtered.length === 0 ? (
          <div className={`flex items-center px-1.5 text-base text-tertiary ${ROW}`}>
            No agents
          </div>
        ) : (
          filtered.map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              className={ROW}
              onSelect={() => openAgentInTile(agent.id, tile.id, "tab")}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: isUnread(agent.status)
                      ? "var(--icon-accent)"
                      : "var(--icon-quaternary)",
                  }}
                />
              </span>
              {agent.title}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
