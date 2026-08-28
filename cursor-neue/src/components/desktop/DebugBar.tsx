import {
  EPHEMERAL_TABS_LABEL,
  EPHEMERAL_TABS_MODES,
  PROJECT_CREATE_LABEL,
  PROJECT_CREATE_MODES,
  PROJECT_FOLDERS_LABEL,
  PROJECT_FOLDERS_MODES,
  PROJECT_MAP_LABEL,
  PROJECT_MAP_MODES,
  PROJECT_SURFACE_LABEL,
  PROJECT_SURFACE_MODES,
  PROJECT_ONBOARDING_LABEL,
  PROJECT_ONBOARDING_MODES,
  SIDEBAR_SECTIONS_LABEL,
  SIDEBAR_SECTIONS_MODES,
  useFeatureFlags,
} from "@/store/useFeatureFlags";

const DEBUG_CHIP =
  "pointer-events-auto flex items-center gap-0.5 rounded-[14px] border border-[color:var(--bg-luminous-secondary)] bg-luminous-secondary p-1 backdrop-blur-[8px]";

/** Slim horizontal debug dock, centered at the bottom of the desktop.
 *  Same glass chrome as the left Dock, smaller padding and text segments
 *  instead of 44px tiles. Prototype-only — writes experiment flags. */
export function DebugBar() {
  const sectionsMode = useFeatureFlags((s) => s.sidebarSections);
  const setSectionsMode = useFeatureFlags((s) => s.setSidebarSections);
  const foldersMode = useFeatureFlags((s) => s.projectFolders);
  const setFoldersMode = useFeatureFlags((s) => s.setProjectFolders);
  const ephemeralMode = useFeatureFlags((s) => s.ephemeralTabs);
  const setEphemeralMode = useFeatureFlags((s) => s.setEphemeralTabs);
  const createMode = useFeatureFlags((s) => s.projectCreate);
  const setCreateMode = useFeatureFlags((s) => s.setProjectCreate);
  const onboarding = useFeatureFlags((s) => s.projectOnboarding);
  const setOnboarding = useFeatureFlags((s) => s.setProjectOnboarding);
  const projectMap = useFeatureFlags((s) => s.projectMap);
  const setProjectMap = useFeatureFlags((s) => s.setProjectMap);
  const projectSurface = useFeatureFlags((s) => s.projectSurface);
  const setProjectSurface = useFeatureFlags((s) => s.setProjectSurface);
  return (
    <div
      data-debug-bar=""
      className="pointer-events-none absolute inset-x-0 bottom-3 z-[200] flex flex-wrap justify-center gap-3"
    >
      <Segmented
        label="Sections"
        options={SIDEBAR_SECTIONS_MODES}
        labels={SIDEBAR_SECTIONS_LABEL}
        value={sectionsMode}
        onSelect={setSectionsMode}
      />
      <Segmented
        label="Project folders"
        options={PROJECT_FOLDERS_MODES}
        labels={PROJECT_FOLDERS_LABEL}
        value={foldersMode}
        onSelect={setFoldersMode}
      />
      <Segmented
        label="Chat tabs"
        options={EPHEMERAL_TABS_MODES}
        labels={EPHEMERAL_TABS_LABEL}
        value={ephemeralMode}
        onSelect={setEphemeralMode}
      />
      <Segmented
        label="Create project"
        options={PROJECT_CREATE_MODES}
        labels={PROJECT_CREATE_LABEL}
        value={createMode}
        onSelect={setCreateMode}
      />
      <Segmented
        label="Onboarding"
        options={PROJECT_ONBOARDING_MODES}
        labels={PROJECT_ONBOARDING_LABEL}
        value={onboarding}
        onSelect={setOnboarding}
      />
      <Segmented
        label="Project map"
        options={PROJECT_MAP_MODES}
        labels={PROJECT_MAP_LABEL}
        value={projectMap}
        onSelect={setProjectMap}
      />
      <Segmented
        label="Surfaces"
        options={PROJECT_SURFACE_MODES}
        labels={PROJECT_SURFACE_LABEL}
        value={projectSurface}
        onSelect={setProjectSurface}
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
