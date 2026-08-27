import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/ui/Icon";
import { OutlineButton } from "@/components/ui/OutlineButton";
import {
  PROJECT_SUGGESTIONS,
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/data/projectTemplates";
import { PROJECT_COLOR_STROKE, type ProjectColor } from "@/types";

const WELL_TONE: Record<ProjectColor, string> = {
  default: "bg-quaternary",
  green: "bg-green-quaternary",
  cyan: "bg-cyan-quaternary",
  blue: "bg-blue-quaternary",
  purple: "bg-purple-quaternary",
  magenta: "bg-magenta-quaternary",
  orange: "bg-orange-quaternary",
  yellow: "bg-yellow-quaternary",
  red: "bg-red-quaternary",
  brand: "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)]",
};

const SECTIONS: { label: string; items: ProjectTemplate[] }[] = [
  { label: "For You", items: PROJECT_SUGGESTIONS },
  { label: "Templates", items: PROJECT_TEMPLATES },
];

/** Checkbox picker for Suggestions create. For You sits above Templates. */
export function NewProjectSuggestions({
  onCustom,
  onAdd,
}: {
  onCustom: () => void;
  onAdd: (templates: ProjectTemplate[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(PROJECT_SUGGESTIONS.map((item) => item.id)),
  );
  const chosen = [...PROJECT_SUGGESTIONS, ...PROJECT_TEMPLATES].filter((item) =>
    selected.has(item.id),
  );
  const count = chosen.length;

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex w-[440px] flex-col gap-5 p-5">
      <div className="flex flex-col gap-1.5">
        <Dialog.Title className="text-3xl font-medium text-primary">
          Projects for large units of work
        </Dialog.Title>
        <Dialog.Description className="text-base text-secondary">
          Add a few starters, or create a custom project. Agents run in parallel
          to get it done.
        </Dialog.Description>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        {SECTIONS.map((section) => (
          <section key={section.label} className="flex flex-col gap-2">
            <h3 className="text-sm text-tertiary">{section.label}</h3>
            <div className="overflow-hidden rounded-xl bg-quaternary">
              {section.items.map((item, index) => (
                <SuggestionRow
                  key={item.id}
                  item={item}
                  checked={selected.has(item.id)}
                  divided={index > 0}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <OutlineButton onClick={onCustom}>Create Custom</OutlineButton>
        <button
          type="button"
          disabled={count === 0}
          onClick={() => onAdd(chosen)}
          className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-neutral px-3 text-lg font-medium text-inverted hover:bg-neutral-hover disabled:pointer-events-none disabled:opacity-40"
        >
          {count === 1 ? "Add 1 Project" : `Add ${count} Projects`}
        </button>
      </div>
    </div>
  );
}

function SuggestionRow({
  item,
  checked,
  divided,
  onToggle,
}: {
  item: ProjectTemplate;
  checked: boolean;
  divided: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={
        divided
          ? "flex w-full items-center gap-2.5 border-t border-quaternary px-3 py-2.5 text-left hover:bg-tertiary"
          : "flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-tertiary"
      }
    >
      <span
        aria-hidden
        className={
          checked
            ? "flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-neutral"
            : "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-secondary"
        }
      >
        {checked && (
          <Icon
            name="check"
            size="2xs"
            color="inherit"
            style={{ color: "var(--text-inverted)" }}
          />
        )}
      </span>
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${WELL_TONE[item.color]}`}
      >
        <Icon
          name={item.icon}
          size="base"
          color="inherit"
          style={{ color: PROJECT_COLOR_STROKE[item.color] }}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-primary">{item.title}</span>
        <span className="block truncate text-sm text-secondary">{item.description}</span>
      </span>
    </button>
  );
}
