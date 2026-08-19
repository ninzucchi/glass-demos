import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { purgeLegacyPanelStorage } from "@/lib/legacyPanelStorage";
import "@/index.css";

// Drop any shared react-resizable-panels layout left by an older build before a
// PanelGroup can read it; per-window pane state now lives in the workspace store.
purgeLegacyPanelStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
