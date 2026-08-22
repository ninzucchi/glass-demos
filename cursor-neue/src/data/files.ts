// Shared, read-only "filesystem" for the demo. Every window reads these trees;
// which file a given Files tab has open is per-window tab metadata, so the data
// here is shared content while navigation stays sandboxed to each window.

import type { IconName } from "@/components/ui/Icon";
import { workspaceIdOfScope } from "@/types";

export type FileTreeNode =
  | { kind: "folder"; name: string; children: FileTreeNode[] }
  | { kind: "file"; name: string };

const folder = (name: string, children: FileTreeNode[]): FileTreeNode => ({
  kind: "folder",
  name,
  children,
});
const file = (name: string): FileTreeNode => ({ kind: "file", name });

// One small tree per workspace, keyed by workspace id. Kept intentionally tiny
// (a dozen-ish nodes) so navigation is legible, not exhaustive.
export const FILE_TREES: Record<string, FileTreeNode[]> = {
  everysphere: [
    folder("app", [
      file("layout.tsx"),
      file("page.tsx"),
      folder("blog", [file("page.tsx")]),
    ]),
    folder("components", [file("Hero.tsx"), file("Nav.tsx"), file("Footer.tsx")]),
    folder("content", [file("home.md"), file("pricing.md")]),
    folder("public", [file("logo.svg")]),
    file("package.json"),
    file("tailwind.config.ts"),
  ],
  "baby-glass": [
    folder("src", [
      file("main.ts"),
      file("hero.ts"),
      folder("styles", [file("app.css"), file("reset.css")]),
    ]),
    folder("assets", [file("glass.svg")]),
    file("index.html"),
    file("vite.config.ts"),
  ],
  "cursor-icons": [
    folder("icons", [
      folder("sidebar", [file("agent.svg"), file("folder.svg"), file("search.svg")]),
      folder("status", [file("running.svg"), file("attention.svg")]),
    ]),
    folder("src", [file("registry.ts"), file("iconNames.ts")]),
    file("package.json"),
  ],
  "cursor-ios": [
    folder("Sources", [
      folder("Views", [file("ContentView.swift"), file("Composer.swift")]),
      folder("Models", [file("Session.swift")]),
    ]),
    folder("Resources", [file("Assets.xcassets"), file("Info.plist")]),
    file("Package.swift"),
  ],
  "figma-plugin": [
    folder("src", [file("code.ts"), file("ui.tsx"), file("messages.ts")]),
    file("manifest.json"),
    file("README.md"),
    file("tsconfig.json"),
  ],
};

// Small fallback so an unknown workspace still renders a tree.
const FALLBACK_TREE: FileTreeNode[] = [
  folder("Docs", [file("notes.md"), file("todo.md")]),
  file("scratch.ts"),
];

/** Resolve a scope id ("ws:<id>@<branch>" | "agent:<id>") to its file tree.
 *  Files are shared across branches of a workspace, so the branch is ignored. */
export function getFileTree(scopeId: string): FileTreeNode[] {
  const workspaceId = workspaceIdOfScope(scopeId);
  if (workspaceId) return FILE_TREES[workspaceId] ?? FALLBACK_TREE;
  return FALLBACK_TREE;
}

/** A recent file plus its parent folder (the breadcrumb / tab `folder` value,
 *  excluding the synthetic project root) so it can be reopened in place. */
export interface RecentFile {
  name: string;
  folder: string;
}

/** Flatten a scope's tree (depth-first) and return the first `count` files.
 *  Stands in for a real "recently opened" list in this prototype. */
export function getRecentFiles(scopeId: string, count = 4): RecentFile[] {
  const out: RecentFile[] = [];
  const walk = (nodes: FileTreeNode[], parentPath: string) => {
    for (const n of nodes) {
      if (out.length >= count) return;
      if (n.kind === "file") out.push({ name: n.name, folder: parentPath });
      else walk(n.children, parentPath ? `${parentPath}/${n.name}` : n.name);
    }
  };
  walk(getFileTree(scopeId), "");
  return out;
}

// Extension -> file-type icon. Falls back to a generic file glyph.
const ICON_BY_EXT: Record<string, IconName> = {
  swift: "file-type-swift-filled",
  ts: "file-type-typescript",
  tsx: "file-type-typescript",
  js: "file-type-javascript",
  jsx: "file-type-javascript",
  css: "file-type-sass",
  scss: "file-type-sass",
  md: "markdown",
  json: "brackets-curly",
  html: "code",
  svg: "file-image",
  png: "file-image",
  py: "logo-python",
  plist: "file-text",
  xcassets: "file-image",
};

export function fileIconFor(name: string): IconName {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
  return ICON_BY_EXT[ext] ?? "file";
}
