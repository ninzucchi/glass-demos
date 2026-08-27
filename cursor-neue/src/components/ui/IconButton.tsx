import clsx from "clsx";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName, type IconSize } from "@/components/ui/Icon";

export type IconButtonSize = "2xs" | "xs" | "sm" | "base" | "lg";

// Container = icon + padding (fixed box), per Figma node 75-3321.
const SPEC: Record<
  IconButtonSize,
  { box: number; radius: number; icon: IconSize; hover: "tertiary" | "quaternary" }
> = {
  "2xs": { box: 14, radius: 4, icon: "2xs", hover: "quaternary" },
  xs: { box: 16, radius: 2, icon: "base", hover: "quaternary" },
  sm: { box: 20, radius: 4, icon: "base", hover: "quaternary" },
  base: { box: 24, radius: 6, icon: "base", hover: "tertiary" },
  lg: { box: 28, radius: 6, icon: "base", hover: "tertiary" },
};

type IconButtonColor = "secondary" | "tertiary";

const COLOR: Record<IconButtonColor, { rest: string; active: string }> = {
  secondary: {
    rest: "text-[color:var(--icon-secondary)] hover:text-[color:var(--icon-primary)]",
    active: "text-[color:var(--icon-primary)]",
  },
  tertiary: {
    rest: "text-[color:var(--icon-tertiary)] hover:text-[color:var(--icon-secondary)]",
    active: "text-[color:var(--icon-secondary)]",
  },
};

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  name: IconName;
  size?: IconButtonSize;
  /** Resting stroke. Default is icon-secondary. */
  color?: IconButtonColor;
  /** Toggled-on / pressed state: renders the icon at icon-primary. */
  active?: boolean;
}

/** Shared chrome icon button. Fixed-size box so placements stay pixel-stable.
 *  Resting icon = icon-secondary, hover/active = icon-primary, disabled = icon-quaternary. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ name, size = "base", color = "secondary", active = false, disabled, className, style, ...props }, ref) => {
    const s = SPEC[size];
    const tone = COLOR[color];
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        data-no-drag=""
        className={clsx(
          "flex shrink-0 items-center justify-center transition-colors",
          tone.rest,
          active && tone.active,
          s.hover === "tertiary" ? "hover:bg-tertiary" : "hover:bg-quaternary",
          disabled && "pointer-events-none text-[color:var(--icon-quaternary)]",
          className,
        )}
        style={{ width: s.box, height: s.box, borderRadius: s.radius, ...style }}
        {...props}
      >
        <Icon name={name} size={s.icon} color="inherit" />
      </button>
    );
  },
);
IconButton.displayName = "IconButton";
