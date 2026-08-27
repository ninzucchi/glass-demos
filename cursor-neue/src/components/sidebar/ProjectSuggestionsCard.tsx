import { Icon } from "@/components/ui/Icon";
import { useUiStore } from "@/store/useUiStore";

/** Compact hint at the top of the Projects section. Same chrome as the promo
 *  card, without the art or title. */
export function ProjectSuggestionsCard() {
  const dismiss = useUiStore((s) => s.dismissProjectSuggestionsCard);
  return (
    <div className="relative mb-1 flex w-full items-start gap-1 overflow-hidden rounded-xl bg-quaternary py-1.5 pl-2.5 pr-1.5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-secondary before:content-['']">
      <span className="min-w-0 flex-1 text-base text-secondary">
        Get Started with these suggested first projects
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="flex size-4 shrink-0 items-center justify-center text-[color:var(--icon-tertiary)] hover:text-[color:var(--icon-secondary)]"
      >
        <Icon name="x" size="sm" color="inherit" />
      </button>
    </div>
  );
}
