import {
  EPHEMERAL_TABS_LABEL,
  EPHEMERAL_TABS_MODES,
  PROJECT_CREATE_LABEL,
  PROJECT_CREATE_MODES,
  PROJECT_FOLDERS_LABEL,
  PROJECT_FOLDERS_MODES,
  PROJECT_ICON_SHAPE_LABEL,
  PROJECT_ICON_SHAPE_MODES,
  SIDEBAR_PROJECTS_LABEL,
  SIDEBAR_PROJECTS_MODES,
  useFeatureFlags,
} from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";

const DEBUG_CHIP =
  "pointer-events-auto flex items-center gap-0.5 rounded-[14px] border border-[color:var(--bg-luminous-secondary)] bg-luminous-secondary p-1 backdrop-blur-[8px]";

/** Slim horizontal debug dock, centered at the bottom of the desktop.
 *  Same glass chrome as the left Dock, smaller padding and text segments
 *  instead of 44px tiles. Prototype-only — writes experiment flags. */
export function DebugBar() {
  const projectsMode = useFeatureFlags((s) => s.sidebarProjects);
  const setProjectsMode = useFeatureFlags((s) => s.setSidebarProjects);
  const foldersMode = useFeatureFlags((s) => s.projectFolders);
  const setFoldersMode = useFeatureFlags((s) => s.setProjectFolders);
  const ephemeralMode = useFeatureFlags((s) => s.ephemeralTabs);
  const setEphemeralMode = useFeatureFlags((s) => s.setEphemeralTabs);
  const iconShape = useFeatureFlags((s) => s.projectIconShape);
  const setIconShape = useFeatureFlags((s) => s.setProjectIconShape);
  const createMode = useFeatureFlags((s) => s.projectCreate);
  const setCreateMode = useFeatureFlags((s) => s.setProjectCreate);
  const promoOn = !useUiStore((s) => s.projectsNuxDismissed);
  const togglePromo = useUiStore((s) => s.toggleProjectsNux);

  return (
    <div
      data-debug-bar=""
      className="pointer-events-none absolute inset-x-0 bottom-3 z-[200] flex flex-wrap justify-center gap-3"
    >
      <button
        type="button"
        aria-pressed={promoOn}
        aria-label="Toggle projects promo"
        onClick={togglePromo}
        className={DEBUG_CHIP}
      >
        <span
          className={
            promoOn
              ? "flex h-6 items-center rounded-[8px] border border-[color:var(--bg-luminous-quaternary)] bg-luminous-secondary px-2.5 text-sm text-white shadow-[inset_0_1px_1px_0_var(--bg-luminous-tertiary)]"
              : "flex h-6 items-center rounded-[8px] border border-transparent px-2.5 text-sm text-luminous-secondary hover:text-luminous"
          }
        >
          Promo
        </span>
      </button>
      <Segmented
        label="Sidebar projects"
        options={SIDEBAR_PROJECTS_MODES}
        labels={SIDEBAR_PROJECTS_LABEL}
        value={projectsMode}
        onSelect={setProjectsMode}
      />
      <Segmented
        label="Project folders"
        options={PROJECT_FOLDERS_MODES}
        labels={PROJECT_FOLDERS_LABEL}
        value={foldersMode}
        onSelect={setFoldersMode}
      />
      <Segmented
        label="Temp tabs"
        options={EPHEMERAL_TABS_MODES}
        labels={EPHEMERAL_TABS_LABEL}
        value={ephemeralMode}
        onSelect={setEphemeralMode}
      />
      <Segmented
        label="Project icons"
        options={PROJECT_ICON_SHAPE_MODES}
        labels={PROJECT_ICON_SHAPE_LABEL}
        value={iconShape}
        onSelect={setIconShape}
      />
      <Segmented
        label="Create project"
        options={PROJECT_CREATE_MODES}
        labels={PROJECT_CREATE_LABEL}
        value={createMode}
        onSelect={setCreateMode}
      />
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  labels,
  value,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onSelect: (mode: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-debug=""
      className={DEBUG_CHIP}
    >
      {options.map((option) => (
        <Segment
          key={option}
          value={option}
          selected={value === option}
          onSelect={onSelect}
          label={labels[option]}
        />
      ))}
    </div>
  );
}

function Segment<T extends string>({
  value,
  selected,
  onSelect,
  label,
}: {
  value: T;
  selected: boolean;
  onSelect: (mode: T) => void;
  label: string;
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
            "h-6 rounded-[8px] border border-[color:var(--bg-luminous-quaternary)] bg-luminous-secondary px-2.5 text-sm text-white shadow-[inset_0_1px_1px_0_var(--bg-luminous-tertiary)]"
          : "h-6 rounded-[8px] border border-transparent px-2.5 text-sm text-luminous-secondary hover:text-luminous"
      }
    >
      {label}
    </button>
  );
}
