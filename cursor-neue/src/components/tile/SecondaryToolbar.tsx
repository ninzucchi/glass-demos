import { Fragment } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Tab, TileNode } from "@/types";
import { TAB_LABEL, contextTabHasOpenFile, filesTabHasOpenFile } from "@/types";
import { tabTypeLabel } from "@/lib/mergedLabels";
import { useMergedSidebar } from "@/store/useFeatureFlags";
import { TAB_REGISTRY } from "@/components/tabs/registry";
import { TileSidebarToggle } from "@/components/tile/TileSidebarToggle";
import { useActiveContextRootName, useActiveWorkspaceName } from "@/store/useWorkspaceStore";
import { useAppearanceStore } from "@/store/useAppearanceStore";

// Realistic parent folder for a file when one isn't set explicitly (e.g. for
// older persisted tabs that predate the `folder` field).
function folderForFile(name: string): string {
  if (name.endsWith(".swift")) return "Views";
  if (name.endsWith(".md")) return "Docs";
  if (name.endsWith(".css") || name.endsWith(".scss")) return "Styles";
  return "src";
}

/** Secondary toolbar. bg-editor so it visually connects to the active tab.
 *  When the tab sidebar is closed, it hosts the (pinned) sidebar toggle on the
 *  left; when open, the toggle lives in the sidebar header instead. */
export function SecondaryToolbar({
  tile,
  tab,
  showToggle,
}: {
  tile: TileNode;
  tab: Tab;
  showToggle: boolean;
}) {
  const def = TAB_REGISTRY[tab.type];
  const workspaceName = useActiveWorkspaceName();
  const contextRootName = useActiveContextRootName();
  const isRight = useAppearanceStore((s) => s.sidebarPlacement === "right");
  const merged = useMergedSidebar();

  // Files get a path-style breadcrumb: a "raw" Files tab (no specific file
  // open) collapses to just the workspace name, while a specific file reads
  // "<folder> > <filename>". Context is the same, but the raw title is the
  // active agent or project. Every other tab type is just its label.
  const isRawFiles = tab.type === "files" && !filesTabHasOpenFile(tab);
  const isRawContext = tab.type === "context" && !contextTabHasOpenFile(tab);
  const fileFolder =
    (tab.type === "files" && !isRawFiles) || (tab.type === "context" && !isRawContext)
      ? tab.folder ?? (tab.type === "files" ? folderForFile(tab.title) : "")
      : null;
  // Each path segment is its own crumb, separated by chevrons (e.g.
  // "Sources > Views > Composer.swift") rather than a slash-joined string.
  const segments = fileFolder ? fileFolder.split("/").filter(Boolean) : [];
  // Browser tabs show the page URL (the tab title set in the seed / address);
  // a brand-new browser tab still on the default label falls back to localhost.
  const browserUrl =
    tab.type === "browser" ? (tab.title === TAB_LABEL.browser ? "localhost:3000" : tab.title) : null;

  // The leading 24px slot only renders when this toolbar hosts the toggle (tab
  // sidebar closed). The toggle only sits to the *left* of the label under left
  // placement; under right placement it's pinned to the trailing edge instead.
  // Whenever the label leads (no toggle, or the toggle is trailing), add a 3px
  // inset so its total leading space is 6px(root) + 3px = 9px — matching the
  // label's vertical padding ((36 - 18px line)/2 = 9px) so the spacing reads even.
  const hasLeadingToggle = showToggle && def.hasSidebar;
  const labelLeads = !hasLeadingToggle || isRight;
  return (
    <div className="flex h-toolbar shrink-0 items-center gap-[5px] bg-editor px-[6px] shadow-[inset_0_-1px_0_0_var(--border-tertiary)]">
      {hasLeadingToggle && (
        <span
          className={`flex w-6 shrink-0 items-center ${
            isRight ? "order-last justify-end" : "justify-center"
          }`}
        >
          <TileSidebarToggle tile={tile} tab={tab} />
        </span>
      )}
      <div
        className={`flex min-w-0 flex-1 items-center gap-1 ${labelLeads ? "pl-[3px]" : ""}`}
      >
        {isRawFiles ? (
          <span className="truncate text-base text-primary">{workspaceName}</span>
        ) : isRawContext ? (
          <span className="truncate text-base text-primary">{contextRootName}</span>
        ) : fileFolder !== null ? (
          <>
            {segments.map((seg, i) => (
              <Fragment key={i}>
                <span className="shrink-0 text-base text-tertiary">{seg}</span>
                <Icon name="chevron-right" size="sm" color="quaternary" />
              </Fragment>
            ))}
            <span className="truncate text-base text-primary">{tab.title}</span>
          </>
        ) : browserUrl ? (
          <span className="truncate text-base text-primary">{browserUrl}</span>
        ) : (
          <span className="shrink-0 text-base text-secondary">
            {tabTypeLabel(tab.type, merged)}
          </span>
        )}
      </div>
    </div>
  );
}
