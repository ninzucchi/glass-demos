import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Icon, type IconName } from "@/components/ui/Icon";
import {
  PROJECT_COLOR_LABEL,
  PROJECT_COLOR_STROKE,
  PROJECT_COLOR_SWATCH,
  PROJECT_COLORS,
  type ProjectColor,
} from "@/types";
import { PICKER_ICON_NAMES, pickerIconMatchesQuery } from "@/icons/pickerIcons";

const CELL =
  "relative flex aspect-square w-full items-center justify-center rounded-md hover:bg-quaternary";

/** Color swatches plus the Cursor icon grid. Clicks write through immediately
 *  and do not dismiss the menu. */
export function ProjectIconPicker({
  icon,
  color,
  onPickIcon,
  onPickColor,
  onBack,
}: {
  icon: IconName;
  color: ProjectColor;
  onPickIcon: (icon: IconName) => void;
  onPickColor: (color: ProjectColor) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const tint = PROJECT_COLOR_STROKE[color];
  const glyphs = useMemo(() => {
    const q = query.trim();
    if (!q) return PICKER_ICON_NAMES;
    return PICKER_ICON_NAMES.filter((name) => pickerIconMatchesQuery(name, q));
  }, [query]);

  return (
    <div className="flex w-[360px] flex-col">
      <div className="flex h-10 items-center gap-1 border-b border-quaternary px-2">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="flex size-7 items-center justify-center rounded-md hover:bg-quaternary"
        >
          <Icon name="arrow-left" size="base" color="secondary" />
        </button>
        <span className="text-base text-secondary">Edit Icon</span>
      </div>
      <div
        role="group"
        aria-label="Icon color"
        className="grid grid-cols-10 items-center gap-[2px] border-b border-quaternary px-2 py-2"
      >
        {PROJECT_COLORS.map((id) => {
          const selected = id === color;
          return (
            <button
              key={id}
              type="button"
              aria-label={PROJECT_COLOR_LABEL[id]}
              aria-pressed={selected}
              onClick={() => onPickColor(id)}
              className={clsx(CELL, selected && "bg-quaternary")}
            >
              <span
                className="pointer-events-none block size-5 rounded-full"
                style={{
                  background: PROJECT_COLOR_SWATCH[id],
                  boxShadow:
                    id === "default" ? "inset 0 0 0 1px var(--border-secondary)" : undefined,
                }}
              />
              {selected && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <Icon
                    name="check"
                    size="xs"
                    color="inherit"
                    style={{
                      color:
                        id === "default" ? "var(--text-primary)" : "var(--text-inverted)",
                    }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="border-b border-quaternary px-2 py-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons..."
          aria-label="Search icons"
          autoFocus
          className="w-full rounded-md bg-quaternary px-2 py-1.5 text-base text-primary outline-none placeholder:text-quaternary"
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </div>
      <div className="max-h-[312px] overflow-y-auto px-2 py-2">
        <div role="listbox" aria-label="Project icons" className="grid grid-cols-10 gap-[2px]">
          {glyphs.map((name) => {
            const selected = name === icon;
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-label={name}
                aria-selected={selected}
                onClick={() => onPickIcon(name)}
                className={clsx(CELL, selected && "bg-quaternary")}
                style={{ color: tint }}
              >
                <Icon name={name} size="base" color="inherit" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
