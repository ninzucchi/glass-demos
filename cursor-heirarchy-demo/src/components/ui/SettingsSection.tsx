import { Fragment } from "react";
import clsx from "clsx";
import { Icon } from "./Icon";

/** Prototype settings list, hosted in the panel beside the window: muted
 *  title over clickable rows, with a check marking the active one. Rows stay
 *  nowrap so the hosting panel sizes to the widest label. */
export function SettingsSection<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: T; label: string; dividerAfter?: boolean }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-quaternary">{title}</span>
      <div className="flex flex-col gap-1">
        {options.map((option) => (
          <Fragment key={option.value}>
            <button
              type="button"
              onClick={() => onChange(option.value)}
              className={clsx(
                "flex items-center gap-1 whitespace-nowrap text-left text-base transition-colors duration-fast",
                option.value === value ? "text-primary" : "text-tertiary hover:text-secondary",
              )}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {option.value === value && <Icon name="check" size="sm" color="primary" />}
              </span>
              {option.label}
            </button>
            {option.dividerAfter && <div className="my-1 border-t" />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
