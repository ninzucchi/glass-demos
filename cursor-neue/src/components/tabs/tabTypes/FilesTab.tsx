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
import { type Tab, filesTabHasOpenFile } from "@/types";
import { type FileTreeNode, fileIconFor, getFileTree } from "@/data/files";
import { FilesHome } from "./FilesHome";
import { isOutsideWindows, newWindowGeo } from "@/components/desktop/geometry";
import { beginTabDrag } from "@/components/tile/tabDragInteraction";
import { SidebarSectionHeader } from "@/components/sidebar/SidebarControls";
import {
  useActiveScopeId,
  useActiveWorkspaceName,
  useWorkspaceStore,
} from "@/store/useWorkspaceStore";

const INDENT_STEP = 12; // px added per tree depth

// Shared row chrome, mirroring SidebarCell (h-7, text-base, rounded-md, the
// quaternary hover/selected wash) so the tree reads like the rest of the rail.
// DISCLOSURE_GROUP marks the row so FolderDisclosureIcon's hover swap works.
// Shared alignment grid (matches the tab bar + secondary toolbar): a 6px leading
// inset (container px-[6px]) + 24px icon slot (w-6) centers the 14px glyph at
// icon-left x=11 / center x=18, and gap-[5px] puts the label at x=35, so the file
// row icon/label line up with the toolbar toggle/breadcrumb above.
const ROW = `${DISCLOSURE_GROUP} flex h-7 w-full items-center gap-[5px] rounded-md pr-2 text-left text-base`;
const LEADING = "flex h-7 w-6 shrink-0 items-center justify-center";
const LABEL = "min-w-0 flex-1 truncate";

/** Left-docked file tree. The workspace is shown as a single root folder; its
 *  descendants navigate by rewriting/adding tabs in the owning window's scope. */
export function FilesSidebar({ tab, tileId }: { tab: Tab; tileId: string }) {
  const scopeId = useActiveScopeId();
  const projectName = useActiveWorkspaceName();
  const openFile = useWorkspaceStore((s) => s.openFile);
  const openFileInNewWindow = useWorkspaceStore((s) => s.openFileInNewWindow);
  const openFileAtRoot = useWorkspaceStore((s) => s.openFileAtRoot);
  const openFileInClosedContent = useWorkspaceStore((s) => s.openFileInClosedContent);
  const nodes = getFileTree(scopeId);
  // Shared across rows: set while a drag is in flight so the click that fires on
  // release doesn't also open the file in place. Only one row drags at a time.
  const didDragRef = useRef(false);

  // Project root + its direct folders open by default. Expansion keys: the root
  // uses the project name; descendants use their breadcrumb path (no root), so
  // the keys line up with the `folder` value stored on a tab.
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set<string>([
        projectName,
        ...nodes.filter((n) => n.kind === "folder").map((n) => n.name),
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
    const overrides: Partial<Tab> = { type: "files", title: name, folder: parentPath };
    const active = tab.title === name && (tab.folder ?? "") === parentPath;
    // Dragging a file row opens it as a tab wherever it lands: the same drop
    // targets as a tab drag (tile tab bar / split, panel edge, closed pane, or
    // a new window when released over the desktop), but creating a tab instead
    // of moving one — so a self-tile drop is a real "open as new tab" action.
    const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) =>
      beginTabDrag(e, {
        createSource: () => ({
          tileId,
          tabId: "",
          title: name,
          icon: fileIconFor(name),
          pane: "content",
          tabType: "files",
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
              // zone ("tab" | "right" | "down") maps directly to a FileDisposition.
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
              // A click that ends a drag shouldn't also open the file in place.
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

  // `parentPath` excludes the synthetic project root, so it equals the breadcrumb
  // / tab `folder` value (e.g. "Sources/Views").
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

  const rootOpen = expanded.has(projectName);
  return (
    <div className="flex flex-col gap-px px-[6px] py-1.5">
      <SidebarSectionHeader label="Files" />
      <FolderRow
        name={projectName}
        depth={0}
        open={rootOpen}
        onToggle={() => toggle(projectName)}
      />
      {rootOpen && renderNodes(nodes, 1, "")}
    </div>
  );
}

/** With a file open, an empty editor stand-in (no file contents in this
 *  prototype); otherwise the Files home filler. */
export function FilesContent({ tab, tileId }: { tab: Tab; tileId: string }) {
  if (filesTabHasOpenFile(tab)) return <div className="h-full w-full bg-editor" />;
  return <FilesHome tab={tab} tileId={tileId} />;
}
