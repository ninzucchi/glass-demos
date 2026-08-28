import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { type ProjectTemplate } from "@/data/projectTemplates";
import { useWindowId } from "@/components/window/WindowContext";
import { useUiStore } from "@/store/useUiStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { DEFAULT_WORKSPACE_ID, PROJECT_COLOR_STROKE } from "@/types";

/** Suggestion row under real projects. Create adds it; the rest of the row
 *  opens the create dialog with this template filled in. */
export function ProjectPlaceholderRow({ item }: { item: ProjectTemplate }) {
  const windowId = useWindowId();
  const createProject = useWorkspaceStore((s) => s.createProject);
  const openNewProject = useUiStore((s) => s.openNewProject);
  const dismiss = useUiStore((s) => s.dismissProjectPlaceholder);

  const add = () => {
    createProject(windowId, {
      title: item.title,
      workspaceId: DEFAULT_WORKSPACE_ID,
      icon: item.icon,
      color: item.color,
      description: item.description,
      agents: item.agents,
    });
    dismiss(item.id);
  };

  const glyph = (
    <Icon
      name={item.icon}
      size="base"
      color="inherit"
      style={{
        color: `color-mix(in oklab, ${PROJECT_COLOR_STROKE[item.color]} 40%, var(--icon-quaternary))`,
      }}
    />
  );

  const openDraft = () => openNewProject(windowId, item);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-placeholder-action]")) return;
        openDraft();
      }}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-placeholder-action]")) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDraft();
        }
      }}
      className="group/ph flex h-[30px] w-full cursor-pointer items-center gap-1.5 rounded-lg px-1.5 text-left text-quaternary hover:bg-quaternary"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{glyph}</span>
      <span
        className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-base mix-blend-plus-darker"
        style={{
          maskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
          WebkitMaskImage: "linear-gradient(to right, #000, #000 calc(100% - 16px), transparent)",
        }}
      >
        {item.title}
      </span>
      <span
        data-placeholder-action=""
        className="flex w-0 shrink-0 items-center justify-end gap-0.5 overflow-hidden opacity-0 group-hover/ph:w-[88px] group-hover/ph:opacity-100"
      >
        <button
          type="button"
          aria-label={`Create ${item.title}`}
          onClick={(e) => {
            e.stopPropagation();
            add();
          }}
          className="flex h-5 shrink-0 items-center rounded-md px-1.5 text-sm font-medium text-secondary hover:bg-tertiary hover:text-primary"
        >
          Create
        </button>
        <IconButton
          name="x"
          size="xs"
          color="tertiary"
          aria-label={`Remove ${item.title}`}
          onClick={(e) => {
            e.stopPropagation();
            dismiss(item.id);
          }}
        />
      </span>
    </div>
  );
}
