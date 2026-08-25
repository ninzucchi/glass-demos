// Thin styled wrapper around Radix Tooltip. Reuses the menu surface tokens
// (bg-elevated + shadow-popover + z-menu) so popovers/menus/tooltips match.
//
// Open state is driven manually from mouseenter/mouseleave instead of Radix's
// built-in hover detection. Radix opens via onPointerMove composed with
// `checkForDefaultPrevented`, but react-resizable-panels registers a
// capture-phase pointermove listener that preventDefaults over a handle — so on
// a resize handle Radix's hover never fires. mouseenter/mouseleave are untouched
// by the library and ignore defaultPrevented, so they work everywhere; Radix is
// still used for positioning/portaling the content.
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, MouseEvent, ReactElement, ReactNode } from "react";

/** Required ancestor for any Tooltip (Radix context). */
export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  /** Tooltip body. */
  content: ReactNode;
  /** Single hover target; cloned to attach hover handlers (must forward a ref). */
  children: ReactElement;
  side?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["side"];
  align?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["align"];
  sideOffset?: number;
  /** Hover delay before opening (ms). */
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  delay = 600,
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  const trigger = isValidElement<{ onMouseEnter?: (e: MouseEvent) => void; onMouseLeave?: (e: MouseEvent) => void }>(
    children,
  )
    ? cloneElement(children, {
        onMouseEnter: (e: MouseEvent) => {
          children.props.onMouseEnter?.(e);
          show();
        },
        onMouseLeave: (e: MouseEvent) => {
          children.props.onMouseLeave?.(e);
          hide();
        },
      })
    : children;

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
      <TooltipPrimitive.Trigger asChild>{trigger}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={clsx(
            "tooltip-appear z-menu select-none bg-elevated text-sm text-primary shadow-popover [transform-origin:var(--radix-tooltip-content-transform-origin)]",
            className ?? "rounded-md px-2 py-1",
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
