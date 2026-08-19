// Thin styled wrappers around Radix ContextMenu (right-click split/close menus
// plus the wallpaper / sidebar-placement radio menus). Shares the dropdown
// menu's visual language via the class constants exported from ./menu.
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  menuContentClass,
  menuItemClass,
  menuLabelClass,
  menuSectionClass,
  menuSeparatorClass,
} from "@/components/ui/menu";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export const ContextMenuContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={clsx(menuContentClass, className)}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = "ContextMenuContent";

export const ContextMenuItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Item ref={ref} className={clsx(menuItemClass, className)} {...props} />
));
ContextMenuItem.displayName = "ContextMenuItem";

// Radio item: same row styling as a plain item, with a trailing check that only
// renders for the selected value. `justify-between` pins the check to the right
// edge so the label column stays aligned across items.
export const ContextMenuRadioItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={clsx(menuItemClass, "justify-between", className)}
    {...props}
  >
    {children}
    <ContextMenuPrimitive.ItemIndicator>
      <Icon name="check" size="base" color="primary" />
    </ContextMenuPrimitive.ItemIndicator>
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";

export const ContextMenuLabel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Label ref={ref} className={clsx(menuLabelClass, className)} {...props} />
));
ContextMenuLabel.displayName = "ContextMenuLabel";

// Padded group of items; place `ContextMenuSeparator` between sections.
export const ContextMenuSection = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Group>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Group ref={ref} className={clsx(menuSectionClass, className)} {...props} />
));
ContextMenuSection.displayName = "ContextMenuSection";

export const ContextMenuSeparator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={clsx(menuSeparatorClass, className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = "ContextMenuSeparator";
