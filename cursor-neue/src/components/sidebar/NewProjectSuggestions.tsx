import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import {
  PROJECT_SUGGESTIONS,
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/data/projectTemplates";
import { isProject, PROJECT_COLOR_STROKE, type ProjectColor } from "@/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

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

const PER_SECTION = 3;

function takeFresh(
  items: ProjectTemplate[],
  existingTitles: Set<string>,
): ProjectTemplate[] {
  return items
    .filter((item) => !existingTitles.has(item.title.toLowerCase()))
    .slice(0, PER_SECTION);
}

/** Checkbox picker for Suggestions create. For You sits above Templates. */
export function NewProjectSuggestions({
  onCustom,
  onAdd,
}: {
  onCustom: () => void;
  onAdd: (templates: ProjectTemplate[]) => void;
}) {
  const agents = useWorkspaceStore((s) => s.agents);
  const existingTitles = useMemo(() => {
    const titles = new Set<string>();
    for (const agent of Object.values(agents)) {
      if (isProject(agent)) titles.add(agent.title.toLowerCase());
    }
    return titles;
  }, [agents]);
  const forYou = useMemo(
    () => takeFresh(PROJECT_SUGGESTIONS, existingTitles),
    [existingTitles],
  );
  const templates = useMemo(
    () => takeFresh(PROJECT_TEMPLATES, existingTitles),
    [existingTitles],
  );
  const sections = [
    { label: "For You", items: forYou },
    { label: "Templates", items: templates },
  ];
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(forYou.map((item) => item.id)),
  );
  const chosen = [...forYou, ...templates].filter((item) => selected.has(item.id));
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
    <div className="relative flex w-[440px] flex-col gap-5 p-5">
      <Dialog.Close asChild>
        <IconButton
          name="x"
          size="base"
          color="tertiary"
          aria-label="Close"
          className="absolute right-4 top-4"
        />
      </Dialog.Close>
      <div className="flex flex-col gap-1.5 pr-8">
        <Dialog.Title className="text-3xl font-medium text-primary">
          Suggested Projects
        </Dialog.Title>
        <Dialog.Description className="text-base text-secondary">
          Create Projects to Take on Large Chunks of Work. Here are a few
          suggestions to get started.
        </Dialog.Description>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        {sections.map((section) => (
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

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={count === 0}
          onClick={() => onAdd(chosen)}
          className="flex h-9 w-full items-center justify-center rounded-lg bg-neutral px-3 text-lg font-medium text-inverted hover:bg-neutral-hover disabled:pointer-events-none disabled:opacity-40"
        >
          {count === 1 ? "Add 1 Project" : `Add ${count} Projects`}
        </button>
        <button
          type="button"
          onClick={onCustom}
          className="flex h-9 w-full items-center justify-center rounded-lg border border-secondary px-3 text-lg font-medium text-primary hover:bg-quaternary"
        >
          Create Custom
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
            ? "flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-neutral shadow-[inset_0_0_0_1px_var(--border-secondary)]"
            : "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-secondary"
        }
      >
        {checked && (
          <Icon
            name="check-filled"
            size="sm"
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
