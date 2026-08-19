import { useEffect } from "react";
import { Desktop } from "@/components/desktop/Desktop";
import { TabDragLayer } from "@/components/tile/TabDragLayer";
import { WorkspaceDragLayer } from "@/components/sidebar/WorkspaceDragLayer";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { useAppearanceStore } from "@/store/useAppearanceStore";

export default function App() {
  // Appearance store is the single source of truth for theme; sync it to the
  // root `dark` class here at the app root rather than from any one control.
  const theme = useAppearanceStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Required Radix Tooltip context. Hover timing is handled per-tooltip in the
  // wrapper (Radix's own hover detection is blocked on resize handles).
  return (
    <TooltipProvider>
      <Desktop />
      <TabDragLayer />
      <WorkspaceDragLayer />
    </TooltipProvider>
  );
}
