import type { IconName } from "@/icons/iconNames";
import { TAB_LABEL, type TabType } from "@/types";
import { sidebarIsMerged } from "@/store/useFeatureFlags";

/** Draft / fallback title for a project agent. */
export function blankProjectTitle(merged = sidebarIsMerged()): string {
  return merged ? "New Group" : "New Project";
}

export function tabTypeLabel(type: TabType, _merged = sidebarIsMerged()): string {
  return TAB_LABEL[type];
}

export function projectBoardIcon(_merged = sidebarIsMerged()): IconName {
  return "chevrons-right-dotted-left";
}
