import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

/** Glass follow-up pill. Label plus an optional tertiary count. */
export function FollowUpPill({
  count,
  selected,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  count?: number;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      data-selected={selected || undefined}
      className={clsx(
        "flex items-center justify-center gap-0.5 overflow-hidden rounded-2xl bg-elevated px-2.5 py-1.5 text-base shadow-[0_0_0_1px_var(--border-secondary)]",
        selected ? "text-primary" : "text-primary hover:bg-tertiary",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {count != null && <span className="tabular-nums text-tertiary">{count}</span>}
    </button>
  );
}
