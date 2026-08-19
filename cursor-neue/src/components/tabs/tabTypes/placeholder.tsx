// Shared empty placeholders. v1 tab content + sidebar are intentionally empty
// containers; each tab type renders the same chrome (toolbar/sidebar) around it.

export function EmptyTabContent() {
  return <div className="h-full w-full bg-editor" />;
}

// Empty per-type sidebar (v1). Renders the chrome only — no placeholder content.
export function EmptyTabSidebar() {
  return <div className="h-full w-full" />;
}
