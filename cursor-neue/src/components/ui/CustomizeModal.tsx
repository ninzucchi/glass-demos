// Stubbed Customize modal: a Radix Dialog rendered inline (no Portal) inside the
// window shell, so the scrim is clipped to the window (rounded-window +
// overflow-hidden) instead of covering the whole desktop. Radix still supplies
// scrim-click dismiss, Escape, and focus trap; `data-no-drag` keeps the window's
// title-strip drag handler from firing on scrim clicks.
import * as Dialog from "@radix-ui/react-dialog";
import { useWindowId } from "@/components/window/WindowContext";
import { useUiStore } from "@/store/useUiStore";

export function CustomizeModal() {
  const windowId = useWindowId();
  const open = useUiStore((s) => s.customizeWindowId === windowId);
  const closeCustomize = useUiStore((s) => s.closeCustomize);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && closeCustomize()}>
      <Dialog.Overlay data-no-drag className="absolute inset-0 z-modal bg-scrim" />
      <Dialog.Content
        data-no-drag
        aria-describedby={undefined}
        className="absolute left-1/2 top-1/2 z-modal h-[min(620px,80%)] w-[min(880px,80%)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border-tertiary)] bg-elevated shadow-window outline-none"
      >
        <Dialog.Title className="sr-only">Customize</Dialog.Title>
        {/* stub: empty body for now */}
      </Dialog.Content>
    </Dialog.Root>
  );
}
