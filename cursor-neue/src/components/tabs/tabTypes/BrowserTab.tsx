import { ACME_AIR, ACME_MARKETING, ACME_MARKETING_NEW_LANDING, BrowserMock } from "./BrowserMock";
import { EmptyTabContent, EmptyTabSidebar } from "./placeholder";
import { useActiveScopeId } from "@/store/useWorkspaceStore";
import { branchOfScope, workspaceIdOfScope } from "@/types";

// Variant follows the window's active scope: the two Acme web projects render
// their landing-page mocks; every other workspace shows an empty pane (a browser
// without a relevant page to fake). acme-marketing is additionally branch-aware
// so the "ettore/new-landing-page" redesign reads as a distinct page.
export const BrowserContent = () => {
  const scopeId = useActiveScopeId();
  const workspaceId = workspaceIdOfScope(scopeId);
  if (workspaceId === "acme-marketing") {
    const isNewLanding = branchOfScope(scopeId) === "ettore/new-landing-page";
    return <BrowserMock {...(isNewLanding ? ACME_MARKETING_NEW_LANDING : ACME_MARKETING)} />;
  }
  if (workspaceId === "acme-microsite") return <BrowserMock {...ACME_AIR} />;
  return <EmptyTabContent />;
};
export const BrowserSidebar = () => <EmptyTabSidebar />;
