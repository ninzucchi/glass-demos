import {
  SIDEBAR_PROJECTS_LABEL,
  SIDEBAR_PROJECTS_MODES,
  useFeatureFlags,
  type SidebarProjectsMode,
} from "@/store/useFeatureFlags";

/** Slim horizontal debug dock, centered at the bottom of the desktop.
 *  Same glass chrome as the left Dock, smaller padding and text segments
 *  instead of 44px tiles. Prototype-only — writes the sidebar-projects flag. */
export function DebugBar() {
  const mode = useFeatureFlags((s) => s.sidebarProjects);
  const setMode = useFeatureFlags((s) => s.setSidebarProjects);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-[200] flex justify-center">
      <div
        role="radiogroup"
        aria-label="Sidebar projects"
        data-debug=""
        className="pointer-events-auto flex items-center gap-0.5 rounded-[14px] border border-[color:var(--bg-luminous-secondary)] bg-luminous-secondary p-1 backdrop-blur-[8px]"
      >
        {SIDEBAR_PROJECTS_MODES.map((value) => (
          <Segment key={value} value={value} selected={mode === value} onSelect={setMode} />
        ))}
      </div>
    </div>
  );
}

function Segment({
  value,
  selected,
  onSelect,
}: {
  value: SidebarProjectsMode;
  selected: boolean;
  onSelect: (mode: SidebarProjectsMode) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={
        selected
          ? // Same tile surface as the dock camera/settings buttons: luminous
            // wash, hairline, inset top highlight.
            "h-6 rounded-[8px] border border-[color:var(--bg-luminous-quaternary)] bg-luminous-secondary px-2.5 text-sm text-luminous shadow-[inset_0_1px_1px_0_var(--bg-luminous-tertiary)]"
          : "h-6 rounded-[8px] border border-transparent px-2.5 text-sm text-luminous-secondary hover:text-luminous"
      }
    >
      {SIDEBAR_PROJECTS_LABEL[value]}
    </button>
  );
}
