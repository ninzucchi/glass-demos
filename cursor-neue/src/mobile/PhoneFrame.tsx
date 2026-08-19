import type { ReactNode } from "react";

// iPhone-ish device shell: 390x844 logical points, shrinking (with preserved
// aspect) on short viewports. Children fill the screen area between the status
// bar and the home indicator.
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex aspect-[390/844] h-[min(844px,100vh_-_48px)] flex-col overflow-hidden rounded-[54px] bg-black p-[10px] shadow-window">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[44px] bg-editor">
        {/* Dynamic island */}
        <div className="pointer-events-none absolute left-1/2 top-[11px] z-10 h-[34px] w-[120px] -translate-x-1/2 rounded-full bg-black" />

        {/* Status bar: time balances the (island-covered) center */}
        <div className="flex h-[54px] shrink-0 items-end justify-between px-9 pb-1.5 text-lg font-semibold text-primary">
          <span>9:41</span>
          <span className="text-sm tracking-tight">5G</span>
        </div>

        <div className="min-h-0 flex-1">{children}</div>

        {/* Home indicator */}
        <div className="flex h-[22px] shrink-0 items-start justify-center pt-1.5">
          <div className="h-[5px] w-[132px] rounded-full bg-neutral" />
        </div>
      </div>
    </div>
  );
}
