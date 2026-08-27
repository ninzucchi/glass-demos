import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

/** Figma OutlineButton, Size 32. Hairline secondary stroke, no fill. */
export function OutlineButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={clsx(
        "flex h-8 items-center justify-center rounded-md border border-secondary px-2 text-base text-primary hover:bg-quaternary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
