import { Icon } from "@/components/ui/Icon";
import type { ProjectTemplate } from "@/data/projectTemplates";
import { PROJECT_COLOR_STROKE, type ProjectColor } from "@/types";

const WELL_TONE: Record<ProjectColor, string> = {
  default: "bg-quaternary border-secondary",
  green: "bg-green-quaternary border-green-quaternary",
  cyan: "bg-cyan-quaternary border-cyan-quaternary",
  blue: "bg-blue-quaternary border-blue-quaternary",
  purple: "bg-purple-quaternary border-purple-quaternary",
  magenta: "bg-magenta-quaternary border-magenta-quaternary",
  orange: "bg-orange-quaternary border-orange-quaternary",
  yellow: "bg-yellow-quaternary border-yellow-quaternary",
  red: "bg-red-quaternary border-red-quaternary",
  brand: "bg-[color-mix(in_oklab,var(--brand)_8%,transparent)] border-[color-mix(in_oklab,var(--brand)_28%,transparent)]",
};

/** Compact template pick used in Advanced create and the New Project strip. */
export function ProjectTemplateCard({
  item,
  onPick,
  surface = "quaternary",
}: {
  item: ProjectTemplate;
  onPick: () => void;
  surface?: "quaternary" | "elevated";
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={
        surface === "elevated"
          ? "flex h-[82px] w-[240px] shrink-0 items-start gap-2.5 overflow-hidden rounded-xl border border-secondary bg-elevated p-2.5 text-left hover:bg-tertiary"
          : "flex h-[82px] w-[240px] shrink-0 items-start gap-2.5 overflow-hidden rounded-xl border border-secondary bg-quaternary p-2.5 text-left hover:bg-tertiary"
      }
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border ${WELL_TONE[item.color]}`}
      >
        <Icon
          name={item.icon}
          color="inherit"
          style={{
            width: 24,
            height: 24,
            fontSize: 24,
            color: PROJECT_COLOR_STROKE[item.color],
          }}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-medium text-primary">{item.title}</span>
        <span className="line-clamp-2 text-base text-secondary">{item.description}</span>
      </span>
    </button>
  );
}
