import type { ReactNode } from "react";
import clsx from "clsx";

/** Folder body: height via grid 0fr↔1fr, opacity on the inner contents.
 *  Same 200ms ease-out-quart as the disclosure chevron. Children stay
 *  mounted while closed so the close animation can play. */
export function SidebarCollapse({
  open,
  padded = true,
  children,
}: {
  open: boolean;
  /** Extra 8px under an open folder body. Off for sections and for the last
   *  folder in a section, so it does not stack on the section gap. */
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={!open}
      className={clsx(
        "grid transition-[grid-template-rows] duration-slow ease-out-quart",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={clsx(
            "transition-opacity duration-slow ease-out-quart",
            padded && "pb-2",
            open ? "opacity-100" : "opacity-0",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
