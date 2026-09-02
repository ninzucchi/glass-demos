import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { DISCLOSURE_GROUP, FolderDisclosureIcon } from "@/components/ui/FolderDisclosureIcon";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { type Tab, contextTabHasOpenFile } from "@/types";
import { type FileTreeNode, fileIconFor } from "@/data/files";
import { getContextTree } from "@/data/context";
import { findTaskByFileName, isTaskContextFile, taskContextTab, taskFileContent } from "@/data/taskFiles";
import { isTasksIndexFile, taskFileNameFromHref, tasksIndexContent } from "@/data/tasksIndex";
import { ContextHome } from "./ContextHome";
import { NotionEditorLocal } from "@/components/tiptap-templates/notion-like/notion-like-editor-local";
import { isOutsideWindows, newWindowGeo } from "@/components/desktop/geometry";
import { beginTabDrag } from "@/components/tile/tabDragInteraction";
import { SidebarSectionHeader } from "@/components/sidebar/SidebarControls";
import { agentDisplayTitle } from "@/lib/agentDisplayName";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import {
  useActiveContextRootName,
  useActiveContextTasks,
  useWorkspaceStore,
} from "@/store/useWorkspaceStore";

const INDENT_STEP = 12;

const ROW = `${DISCLOSURE_GROUP} flex h-7 w-full items-center gap-[5px] rounded-md pr-2 text-left text-base`;
const LEADING = "flex h-7 w-6 shrink-0 items-center justify-center";
const LABEL = "min-w-0 flex-1 truncate";

/** Left-docked context tree. The root is the active agent or project name. */
export function ContextSidebar({ tab, tileId }: { tab: Tab; tileId: string }) {
  const rootName = useActiveContextRootName();
  const openFile = useWorkspaceStore((s) => s.openFile);
  const openFileInNewWindow = useWorkspaceStore((s) => s.openFileInNewWindow);
  const openFileAtRoot = useWorkspaceStore((s) => s.openFileAtRoot);
  const openFileInClosedContent = useWorkspaceStore((s) => s.openFileInClosedContent);
  const tasks = useActiveContextTasks();
  const nodes = getContextTree(tasks);
  const didDragRef = useRef(false);

  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set<string>([
        "__root__",
        "project",
        "project/tasks",
        "user",
      ]),
  );
  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const FolderRow = ({
    name,
    depth,
    open,
    onToggle,
  }: {
    name: string;
    depth: number;
    open: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      style={{ paddingLeft: depth * INDENT_STEP }}
      onClick={onToggle}
      className={clsx(ROW, "text-secondary hover:bg-quaternary")}
    >
      <span className={LEADING}>
        <FolderDisclosureIcon open={open} />
      </span>
      <span className={LABEL}>{name}</span>
    </button>
  );

  const FileRow = ({ name, depth, parentPath }: { name: string; depth: number; parentPath: string }) => {
    const overrides: Partial<Tab> = { type: "context", title: name, folder: parentPath };
    const active = tab.title === name && (tab.folder ?? "") === parentPath;
    const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) =>
      beginTabDrag(e, {
        createSource: () => ({
          tileId,
          tabId: "",
          title: name,
          icon: fileIconFor(name),
          pane: "content",
          tabType: "context",
        }),
        suppressSelfTile: false,
        didDragRef,
        onDrop: (source, target, pointer) => {
          if (target) {
            if (target.scope === "root") {
              openFileAtRoot(target.windowId, target.scopeId, overrides, target.side);
            } else if (target.scope === "open") {
              openFileInClosedContent(target.windowId, target.scopeId, overrides);
            } else if (target.scope === "tile") {
              openFile(target.tileId, "", overrides, target.zone);
            }
          } else if (isOutsideWindows(pointer.x, pointer.y)) {
            openFileInNewWindow(source.tileId, overrides, newWindowGeo(pointer));
          }
        },
      });
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            style={{ paddingLeft: depth * INDENT_STEP }}
            onPointerDown={onPointerDown}
            onClick={(e) => {
              if (didDragRef.current) {
                didDragRef.current = false;
                return;
              }
              openFile(tileId, tab.id, overrides, e.metaKey || e.ctrlKey ? "tab" : "here");
            }}
            className={clsx(
              ROW,
              active ? "bg-quaternary text-primary" : "text-secondary hover:bg-quaternary",
            )}
          >
            <span className={LEADING}>
              <Icon name={fileIconFor(name)} size="base" color={active ? "secondary" : "tertiary"} />
            </span>
            <span className={LABEL}>{name}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSection>
            <ContextMenuItem onSelect={() => openFile(tileId, tab.id, overrides, "right")}>
              <Icon name="layout-split-horizontal" size="base" color="tertiary" />
              Split Right
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => openFile(tileId, tab.id, overrides, "down")}>
              <Icon name="layout-split-vertical" size="base" color="tertiary" />
              Split Down
            </ContextMenuItem>
          </ContextMenuSection>
          <ContextMenuSeparator />
          <ContextMenuSection>
            <ContextMenuItem onSelect={() => openFile(tileId, tab.id, overrides, "tab")}>
              <Icon name="tabs" size="base" color="tertiary" />
              Open in New Tab
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => openFileInNewWindow(tileId, overrides, newWindowGeo())}>
              <Icon name="focus-window" size="base" color="tertiary" />
              Open in New Window
            </ContextMenuItem>
          </ContextMenuSection>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderNodes = (list: FileTreeNode[], depth: number, parentPath: string) =>
    list.map((node) => {
      if (node.kind === "folder") {
        const path = parentPath ? `${parentPath}/${node.name}` : node.name;
        const open = expanded.has(path);
        return (
          <div key={path} className="flex flex-col gap-px">
            <FolderRow name={node.name} depth={depth} open={open} onToggle={() => toggle(path)} />
            {open && renderNodes(node.children, depth + 1, path)}
          </div>
        );
      }
      return (
        <FileRow
          key={parentPath ? `${parentPath}/${node.name}` : node.name}
          name={node.name}
          depth={depth}
          parentPath={parentPath}
        />
      );
    });

  const rootOpen = expanded.has("__root__");
  return (
    <div className="flex flex-col gap-px px-[6px] py-1.5">
      <SidebarSectionHeader label="Context" />
      <FolderRow
        name={rootName}
        depth={0}
        open={rootOpen}
        onToggle={() => toggle("__root__")}
      />
      {rootOpen && renderNodes(nodes, 1, "")}
    </div>
  );
}

export function ContextContent({ tab, tileId }: { tab: Tab; tileId: string }) {
  const namesMode = useFeatureFlags((s) => s.agentNames);
  const tasks = useActiveContextTasks();
  const openFile = useWorkspaceStore((s) => s.openFile);
  const hit = isTaskContextFile(tab) && tab.title ? findTaskByFileName(tab.title) : undefined;
  const agent = useWorkspaceStore((s) =>
    hit?.task.agentId ? s.agents[hit.task.agentId] : undefined,
  );
  if (!contextTabHasOpenFile(tab)) return <ContextHome tab={tab} tileId={tileId} />;
  if (isTasksIndexFile(tab)) {
    const sourceKey = `${tab.folder}/${tab.title}-${tasks.map((task) => task.id).join("|")}`;
    return (
      <NotionEditorLocal
        content={tasksIndexContent(tasks)}
        sourceKey={sourceKey}
        onLinkClick={(href) => {
          const name = taskFileNameFromHref(href);
          const target = name ? findTaskByFileName(name) : undefined;
          if (!target) return;
          openFile(tileId, tab.id, taskContextTab(target.projectId, target.task), "here");
        }}
      />
    );
  }
  if (hit) {
    const assignee = agent ? agentDisplayTitle(agent, namesMode) : "";
    return (
      <NotionEditorLocal
        content={taskFileContent(hit.task, assignee)}
        sourceKey={`${tab.folder}/${tab.title}-${namesMode}`}
      />
    );
  }
  return <div className="h-full w-full bg-editor" />;
}
