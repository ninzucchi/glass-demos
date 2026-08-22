import { BABY_GLASS, EVERYSPHERE, EVERYSPHERE_REDESIGN, BrowserMock } from "./BrowserMock";
import { EmptyTabContent, EmptyTabSidebar } from "./placeholder";
import { useActiveScopeId } from "@/store/useWorkspaceStore";
import { branchOfScope, workspaceIdOfScope } from "@/types";

// Variant follows the window's active scope: the two web projects render their
// landing-page mocks; every other workspace shows an empty pane (a browser
// without a relevant page to fake). everysphere is additionally branch-aware
// so the "ettore/new-landing-page" redesign reads as a distinct page.
export const BrowserContent = () => {
  const scopeId = useActiveScopeId();
  const workspaceId = workspaceIdOfScope(scopeId);
  if (workspaceId === "everysphere") {
    const isNewLanding = branchOfScope(scopeId) === "ettore/new-landing-page";
    return <BrowserMock {...(isNewLanding ? EVERYSPHERE_REDESIGN : EVERYSPHERE)} />;
  }
  if (workspaceId === "baby-glass") return <BrowserMock {...BABY_GLASS} />;
  return <EmptyTabContent />;
};
export const BrowserSidebar = () => <EmptyTabSidebar />;
