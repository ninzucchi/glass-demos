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
      "Spec writer",
      "API implementer",
      "Test runner",
      "Docs expert",
      "Review lead",
      "Design expert",
    ],
  },
  {
    id: "tpl-migration",
    title: "Migration Team",
    description: "Run a dependency or platform migration.",
    icon: "code-simple",
    color: "purple",
    agents: [
      "Token expert",
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
    agents: ["Repro hunter", "Fix writer", "Verify lead", "Flake finder"],
  },
  {
    id: "tpl-release",
    title: "Release Train",
    description: "Cut a version and ship the notes.",
    icon: "rocket",
    color: "magenta",
    agents: ["Changelog", "Version bump", "Smoke tests", "Announce copy"],
  },
];

export const PROJECT_SUGGESTIONS: ProjectTemplate[] = [
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
    id: "sug-docs",
    title: "Docs Overhaul",
    description: "Rewrite guides, examples, and the changelog.",
    icon: "book-open",
    color: "orange",
    agents: ["IA planner", "Page writer", "Link checker", "Screenshot pass"],
  },
  {
    id: "sug-design-system",
    title: "Design System",
    description: "Audit tokens, components, and contrast.",
    icon: "swatches",
    color: "cyan",
    agents: ["Token expert", "Component audit", "Icon pass", "Type scale", "Contrast check"],
  },
];

/** Sidebar placeholders when onboarding is New. */
export const SIDEBAR_PROJECT_PLACEHOLDERS: ProjectTemplate[] = [
  {
    id: "ph-glass-sidebar",
    title: "Glass Sidebar",
    description: "Ship the Glass Projects sidebar, grouping, and empty states.",
    icon: "layout-sidebar-left",
    color: "blue",
    agents: [
      "Sidebar project visuals",
      "Projects row leading click",
      "Agent grouping",
      "Empty onboarding",
    ],
  },
  {
    id: "ph-canvas-upgrades",
    title: "Canvas Upgrades",
    description: "Make Canvas reliable to create, easy to find, and polished on first open.",
    icon: "image",
    color: "cyan",
    agents: [
      "Empty CTA",
      "Tray padding",
      "Recent landing",
      "First-run polish",
    ],
  },
  {
    id: "ph-subscription-tray",
    title: "Subscription Tray",
    description: "Add the Listening pill to project chats and the subscriptions tray.",
    icon: "waveform",
    color: "green",
    agents: [
      "Listening project intent",
      "Project pills",
      "Subscriptions tray",
      "Hide on child agents",
    ],
  },
  {
    id: "ph-gen-ui",
    title: "Gen UI",
    description: "Render raw HTML fragment visualizations in chat.",
    icon: "brush",
    color: "orange",
    agents: [
      "Chart renderer",
      "HTML sandbox",
      "Theme tokens",
      "Snapshot tests",
    ],
  },
];
