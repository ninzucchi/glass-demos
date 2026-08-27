import { IconButton } from "@/components/ui/IconButton";

/** Sticky account row under the sidebar list. Name matches a sidebar row
 *  (base / secondary). Org is tertiary sm. */
export function SidebarFooter() {
  return (
    <footer className="shrink-0 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-8 w-8 shrink-0 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)",
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base text-secondary mix-blend-plus-darker">
            Nick Inzucchi
          </div>
          <div className="truncate text-sm text-tertiary">Anysphere</div>
        </div>
        <IconButton name="cog" size="sm" color="tertiary" aria-label="Settings" />
      </div>
    </footer>
  );
}
