import { Icon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSection,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import type { WorkspaceOption } from "@/types";
import { useWorkspaceSwitcher } from "@/store/useWorkspaceStore";

// `folders` for the "All Workspaces" aggregate, `folder` for an individual one.
const iconFor = (option: WorkspaceOption) => (option.id === null ? "folders" : "folder");

/** Footer workspace switcher: a dropdown over the headless `useWorkspaceSwitcher`
 *  hook. Selecting an option filters the window's sidebar ("All Workspaces" shows
 *  everything); only the trigger's icon wears a swatch container. */
export function WorkspaceSwitcher() {
  const { options, selectedOption, select } = useWorkspaceSwitcher();
  const allOption = options[0];
  const workspaceOptions = options.slice(1);

  const renderItem = (option: WorkspaceOption) => (
    <DropdownMenuItem key={option.id ?? "all"} onSelect={() => select(option.id)}>
      <Icon name={iconFor(option)} size="base" color="tertiary" />
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {selectedOption.id === option.id && <Icon name="check" size="base" color="secondary" />}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Even p-1 inset so the hover bg sits uniformly around the contents. */}
        <button
          type="button"
          // rounded-[10px] = chiclet radius (6px) + p-1 (4px) so the hover bg is
          // concentric with the swatch chiclet inside it. gap-1 (vs the usual
          // gap-2) offsets the label's own px-0.5 so the chiclet-to-text spacing
          // stays tight while the label keeps 2px of right clearance.
          className="flex w-fit max-w-full cursor-default select-none items-center gap-1 rounded-[10px] p-1 text-base text-secondary outline-none hover:bg-quaternary hover:text-primary"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-tertiary">
            <Icon name={iconFor(selectedOption)} size="sm" color="secondary" />
          </span>
          <span className="min-w-0 flex-1 truncate px-0.5">{selectedOption.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={6} className="min-w-[200px]">
        <DropdownMenuSection>{renderItem(allOption)}</DropdownMenuSection>
        <DropdownMenuSeparator />
        <DropdownMenuSection>{workspaceOptions.map(renderItem)}</DropdownMenuSection>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
