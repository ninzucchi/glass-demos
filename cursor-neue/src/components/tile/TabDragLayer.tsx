import { Icon } from "@/components/ui/Icon";
import { DragChip } from "@/components/ui/DragChip";
import { useTabDragStore } from "@/store/tabDrag";

/** Floating chip that follows the cursor while a tab is being dragged. */
export function TabDragLayer() {
  const source = useTabDragStore((s) => s.source);
  const pointer = useTabDragStore((s) => s.pointer);
  if (!source) return null;

  return (
    <DragChip pointer={pointer}>
      <div className="flex items-center gap-[8px] py-[9px] pl-[11px] pr-[12px]">
        <Icon name={source.icon} size="base" color="secondary" />
        <span className="min-w-0 truncate px-[2px] text-base leading-[18px]">{source.title}</span>
      </div>
    </DragChip>
  );
}
