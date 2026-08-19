import { DragChip } from "@/components/ui/DragChip";
import { FolderDisclosureIcon } from "@/components/ui/FolderDisclosureIcon";
import { useWorkspaceDragStore } from "@/store/workspaceDrag";

/** Floating chip shown while dragging a workspace row out to spawn a filtered
 *  window. No DISCLOSURE_GROUP marker, so the folder glyph never swaps to a chevron. */
export function WorkspaceDragLayer() {
  const source = useWorkspaceDragStore((s) => s.source);
  const pointer = useWorkspaceDragStore((s) => s.pointer);
  if (!source) return null;

  return (
    <DragChip pointer={pointer}>
      <div className="flex h-toolbar items-center gap-1.5 pl-2.5 pr-3">
        <FolderDisclosureIcon open={false} />
        <span className="min-w-0 truncate text-sm">{source.label}</span>
      </div>
    </DragChip>
  );
}
