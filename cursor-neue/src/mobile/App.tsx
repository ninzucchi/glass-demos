import { useEffect, useState } from "react";
import { PhoneFrame } from "@/mobile/PhoneFrame";
import { Icon } from "@/components/ui/Icon";

// Root of the mobile demo surface (own Vite entry: /mobile.html). This tree is
// independent of the desktop demo — it shares only the design-system layer
// (tokens, ui, icons); see .cursor/rules/mobile-surface-boundary.mdc.
export function MobileApp() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <PhoneFrame>
        {/* Placeholder screen — replace with the real mobile demo. */}
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <Icon name="cursor-logo-filled" size="xl" color="secondary" />
          <span className="text-sm text-tertiary">Mobile demo</span>
        </div>
      </PhoneFrame>

      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="absolute bottom-4 left-4 flex size-9 items-center justify-center rounded-full border border-[color:var(--bg-luminous-secondary)] bg-luminous-secondary backdrop-blur-[8px] transition-transform duration-fast hover:scale-105"
      >
        <Icon name={theme === "light" ? "moon" : "sun"} color="luminous" />
      </button>
    </div>
  );
}
