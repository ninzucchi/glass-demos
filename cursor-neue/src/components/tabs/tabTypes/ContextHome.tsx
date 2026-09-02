import { useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { SidebarCell } from "@/components/sidebar/SidebarCell";
import { SidebarSectionHeader } from "@/components/sidebar/SidebarControls";
import { fileIconFor } from "@/data/files";
import { getRecentContextFiles } from "@/data/context";
import type { Tab } from "@/types";
import { isOutsideWindows, newWindowGeo } from "@/components/desktop/geometry";
import { beginTabDrag } from "@/components/tile/tabDragInteraction";
import { useActiveContextTasks, useWorkspaceStore } from "@/store/useWorkspaceStore";

/** Home surface for a Context tab with no file open. */
export function ContextHome({ tab, tileId }: { tab: Tab; tileId: string }) {
  const tasks = useActiveContextTasks();
  const recents = getRecentContextFiles(tasks);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const openFileInNewWindow = useWorkspaceStore((s) => s.openFileInNewWindow);
  const openFileAtRoot = useWorkspaceStore((s) => s.openFileAtRoot);
  const openFileInClosedContent = useWorkspaceStore((s) => s.openFileInClosedContent);
  const didDragRef = useRef(false);

  return (
    <div className="h-full w-full overflow-auto bg-editor">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-6 py-8">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-full border border-tertiary bg-quinary px-2.5 py-2">
          <Icon name="magnifying-glass" size="base" color="tertiary" className="shrink-0" />
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-base text-tertiary">
            Context files, folders...
          </span>
        </div>

        <div className="flex flex-col gap-4 px-1">
          <section className="flex flex-col gap-[5px]">
            <SidebarSectionHeader label="Actions" />
            <div className="flex flex-col gap-px">
              <SidebarCell label="New File" leading={{ kind: "action", icon: "file-plus" }} />
              <SidebarCell label="New Folder" leading={{ kind: "action", icon: "folder-plus" }} />
            </div>
          </section>

          <section className="flex flex-col gap-[5px]">
            <SidebarSectionHeader label="Recent Files" />
            <div className="flex flex-col gap-px">
              {recents.map((recent, i) => {
                const overrides: Partial<Tab> = {
                  type: "context",
                  title: recent.name,
                  folder: recent.folder,
                };
                return (
                  <SidebarCell
                    key={`${recent.folder}/${recent.name}-${i}`}
                    label={recent.name}
                    leading={{ kind: "action", icon: fileIconFor(recent.name) }}
                    onPointerDown={(e) =>
                      beginTabDrag(e, {
                        createSource: () => ({
                          tileId,
                          tabId: "",
                          title: recent.name,
                          icon: fileIconFor(recent.name),
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
                      })
                    }
                    onClick={() => {
                      if (didDragRef.current) {
                        didDragRef.current = false;
                        return;
                      }
                      openFile(tileId, tab.id, overrides, "here");
                    }}
                  />
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
