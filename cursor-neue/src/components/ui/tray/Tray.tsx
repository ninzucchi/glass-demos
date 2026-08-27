import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { ScrollArea } from "@/components/ui/ScrollArea";

/** Elevated tray surface. Matches everysphere Tray: rounded elevated panel
 *  with a 1px secondary ring. */
export function Tray({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-component="tray"
      className={clsx(
        // Radius = row (8px) + side padding (8px). No bottom pad so a long list
        // scrolls flush with the tray edge; ScrollArea fades that edge.
        "flex w-full flex-col gap-0.5 overflow-hidden rounded-2xl bg-elevated px-2 pt-2 shadow-[0_0_0_1px_var(--border-secondary)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Title row. Leading label, optional trailing chrome (e.g. more). */
export function TrayHeader({
  title,
  trailing,
  className,
}: {
  title: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-component="tray-header"
      className={clsx("flex items-center gap-1.5 px-1 pb-1 pt-0.5", className)}
    >
      <p className="min-w-0 flex-1 text-base text-secondary">{title}</p>
      {trailing}
    </div>
  );
}

/** Stack of tray rows. ScrollArea hides the scrollbar and fades overflow edges. */
export function TrayRows({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ScrollArea
      className={clsx("max-h-[220px]", className)}
      contentClassName="gap-px"
    >
      {children}
    </ScrollArea>
  );
}

export function TrayRow({
  leading,
  label,
  description,
  meta,
  onClick,
  className,
}: {
  leading?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const interactive = !!onClick;
  return (
    <div
      data-component="tray-row"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={clsx(
        "flex h-7 w-full cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-tertiary",
        className,
      )}
    >
      {leading && <span className="flex size-3 shrink-0 items-center justify-center">{leading}</span>}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {description != null ? (
          <>
            <span className="shrink-0 text-base text-tertiary">{label}</span>
            <span className="min-w-0 flex-1 truncate text-base text-primary">{description}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-base text-primary">{label}</span>
        )}
        {meta && <span className="flex shrink-0 items-center justify-center gap-1">{meta}</span>}
      </div>
    </div>
  );
}
