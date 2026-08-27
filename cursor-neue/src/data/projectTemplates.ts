import type { IconName } from "@/icons/iconNames";
import type { ProjectColor } from "@/types";

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  color: ProjectColor;
  /** Child agent titles. Created with the project when the card is picked. */
  agents: string[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "tpl-feature-swarm",
    title: "Feature Swarm",
    description: "Build a large feature across code, tests, and docs.",
    icon: "code",
    color: "blue",
    agents: [
      "Spec Writer",
      "API Implementer",
      "Test Runner",
      "Docs Expert",
      "Review Lead",
      "Design Expert",
    ],
  },
  {
    id: "tpl-migration",
    title: "Migration Team",
    description: "Run a dependency or platform migration.",
    icon: "code-simple",
    color: "purple",
    agents: [
      "Token Expert",
      "Port select",
      "Swap dialog",
      "Replace toggles",
      "Stack toasts",
      "Folder collapse",
    ],
  },
  {
    id: "tpl-bug-bash",
    title: "Bug Bash Coordinator",
    description: "Reproduce, fix, and verify a backlog of bugs.",
    icon: "bug",
    color: "green",
    agents: ["Repro Hunter", "Fix Writer", "Verify Lead", "Flake Finder"],
  },
  {
    id: "tpl-docs",
    title: "Docs Overhaul",
    description: "Rewrite guides, examples, and the changelog.",
    icon: "book-open",
    color: "orange",
    agents: ["IA Planner", "Page Writer", "Link Checker", "Screenshot pass"],
  },
  {
    id: "tpl-release",
    title: "Release Train",
    description: "Cut a version and ship the notes.",
    icon: "rocket",
    color: "magenta",
    agents: ["Changelog", "Version bump", "Smoke tests", "Announce copy"],
  },
  {
    id: "tpl-design-system",
    title: "Design System",
    description: "Audit tokens, components, and contrast.",
    icon: "swatches",
    color: "cyan",
    agents: ["Token Expert", "Component audit", "Icon pass", "Type scale", "Contrast check"],
  },
];

export const PROJECT_SUGGESTIONS: ProjectTemplate[] = [
  {
    id: "sug-sidebar",
    title: "Glass sidebar",
    description: "Polish and develop the left sidebar in Glass.",
    icon: "layout-sidebar-left",
    color: "blue",
    agents: [
      "Folder hover",
      "Pin projects",
      "Unread badge",
      "Collapse Fixer",
      "Recents group",
      "Footer pin",
      "Density pass",
      "Tooltip port",
      "Row height",
      "Drag reorder",
      "Archive row",
      "Search filter",
    ],
  },
  {
    id: "sug-base-ui",
    title: "Base UI migration",
    description: "Convert UI components to BaseUI primitives",
    icon: "arrows-left-right",
    color: "purple",
    agents: [
      "Menu Implementer",
      "Port tooltip",
      "Swap dialog",
      "Port buttons",
      "Token Expert",
      "Port popover",
      "Port select",
      "Scroll area",
      "Port checkbox",
      "Replace radios",
    ],
  },
  {
    id: "sug-viz",
    title: "Inline Visualizations",
    description: "Render raw HTML fragment visualizations in chat.",
    icon: "brush",
    color: "green",
    agents: [
      "Chart renderer",
      "HTML sandbox",
      "Theme tokens",
      "Snapshot tests",
      "A11y pass",
      "Copy polish",
      "Motion pass",
      "Empty states",
    ],
  },
  {
    id: "sug-keyboard",
    title: "Keyboard accessibility",
    description: "Make every Glass surface reachable from the keyboard.",
    icon: "keyboard",
    color: "purple",
    agents: [
      "Composer tabs",
      "Focus trap",
      "Skip link",
      "Arrow keys",
      "Escape menus",
      "Tab Walker",
      "Focus rings",
      "Status Announcer",
      "Focus restore",
      "Menu typeahead",
    ],
  },
];
