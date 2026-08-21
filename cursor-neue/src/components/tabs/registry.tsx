// Tab-type registry: the single extension seam. Adding a real tab type later
// means swapping its Content/Sidebar here; everything else is type-driven.
import type { ComponentType } from "react";
import type { IconName } from "@/components/ui/Icon";
import type { Tab, TabType } from "@/types";
import { filesTabHasOpenFile } from "@/types";
import { FilesContent, FilesSidebar } from "@/components/tabs/tabTypes/FilesTab";
import { BrowserContent, BrowserSidebar } from "@/components/tabs/tabTypes/BrowserTab";
import { TerminalContent, TerminalSidebar } from "@/components/tabs/tabTypes/TerminalTab";
import { CanvasContent, CanvasSidebar } from "@/components/tabs/tabTypes/CanvasTab";
import { ReviewContent, ReviewSidebar } from "@/components/tabs/tabTypes/ReviewTab";
import { ChatBody } from "@/components/chat/ChatBody";
import { fileIconFor } from "@/data/files";

// Display label lives in TAB_LABEL (see @/types) as the single source of truth.
// `tileId` lets a tab's content/sidebar address its own tab for layout actions
// (e.g. Files navigation rewrites its tab via the store); types that don't need
// it simply ignore the prop.
export interface TabTypeDef {
  icon: IconName;
  hasSidebar: boolean;
  Content: ComponentType<{ tab: Tab; tileId: string }>;
  Sidebar: ComponentType<{ tab: Tab; tileId: string }>;
}

/** Tab chrome icon: specific open files use file-type icons; generic tabs use the registry default. */
export function tabIcon(tab: Tab): IconName {
  if (filesTabHasOpenFile(tab)) {
    return fileIconFor(tab.title);
  }
  return TAB_REGISTRY[tab.type].icon;
}

export const TAB_REGISTRY: Record<TabType, TabTypeDef> = {
  chat: { icon: "agent", hasSidebar: false, Content: ChatBody, Sidebar: () => null },
  files: { icon: "folder", hasSidebar: true, Content: FilesContent, Sidebar: FilesSidebar },
  browser: { icon: "globe", hasSidebar: true, Content: BrowserContent, Sidebar: BrowserSidebar },
  terminal: {
    icon: "terminal-rectangle",
    hasSidebar: true,
    Content: TerminalContent,
    Sidebar: TerminalSidebar,
  },
  canvas: { icon: "brush", hasSidebar: true, Content: CanvasContent, Sidebar: CanvasSidebar },
  review: { icon: "plus-minus", hasSidebar: true, Content: ReviewContent, Sidebar: ReviewSidebar },
};
