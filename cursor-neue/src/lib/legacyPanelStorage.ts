// react-resizable-panels persists a group's layout to
// `react-resizable-panels:<autoSaveId>` keyed by the group's panel ids. Every
// window renders the same shell (panels "main"/"sidebar") and chat/content
// split, so an earlier build that gave those groups a *constant* autoSaveId
// ("window-shell" / "chat-content-split") made all windows read & write one
// shared entry — collapsing/resizing in one window leaked into the rest.
//
// Per-window collapse now lives in the workspace store (sandboxed), and the
// PanelGroups intentionally carry no autoSaveId, so the app never legitimately
// writes any `react-resizable-panels:*` key. Any such key is therefore stale
// residue from the old shared-state build; purge it on boot so a long-lived
// browser session can't keep leaking through it.
const LEGACY_PREFIX = "react-resizable-panels:";

export function purgeLegacyPanelStorage(): void {
  try {
    const stale = Object.keys(localStorage).filter((k) => k.startsWith(LEGACY_PREFIX));
    for (const key of stale) localStorage.removeItem(key);
  } catch {
    // Ignore environments without localStorage (or access denied); there is
    // simply nothing to clean up there.
  }
}
