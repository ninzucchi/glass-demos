import clsx from "clsx";

/** Inset segmented toggle for the settings panel: a recessed capsule track
 *  with an elevated capsule on the active segment. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-quaternary p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            "flex h-6 flex-1 items-center justify-center whitespace-nowrap rounded-full px-2 text-base transition-colors duration-fast",
            option.value === value
              ? "bg-elevated text-primary shadow-sm"
              : "text-secondary hover:text-primary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
