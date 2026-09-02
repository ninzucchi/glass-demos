import { useWindowId } from "@/components/window/WindowContext";
import { useUiStore } from "@/store/useUiStore";

/** Empty-state promo in the Projects section. Shown when the list has no projects. */
export function ProjectsSectionNux() {
  const windowId = useWindowId();
  const openNewProject = useUiStore((s) => s.openNewProject);
  return (
    <div className="mx-1.5 my-2">
      <div className="relative flex w-full flex-col items-center overflow-hidden rounded-xl px-4 py-7 text-center before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-dashed before:border-secondary before:content-['']">
        <div className="flex flex-col items-center gap-1">
          <div className="text-base font-medium text-secondary">Create your first project</div>
          <div className="text-base text-tertiary">
            Take on large units of work without getting lost in the weeds
          </div>
        </div>
        <button
          type="button"
          onClick={() => openNewProject(windowId)}
          className="relative mt-3 flex h-7 w-fit items-center justify-center rounded-lg border border-secondary px-3 text-base font-medium text-primary hover:bg-quaternary"
        >
          Create
        </button>
      </div>
    </div>
  );
}
