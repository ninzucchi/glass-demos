// Thin styled wrappers around Radix DropdownMenu (used for the + tab-type menu).
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { Icon } from "@/components/ui/Icon";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

// No real `border` here: shadow-popover already bakes in a 1px hairline ring
// (see --cursor-box-shadow-base), so adding a border would double it up.
// The panel carries no padding of its own — that lives on each section — so
// separators can be direct children that bleed to the full panel width.
export const menuContentClass =
  "z-menu flex min-w-[180px] flex-col overflow-hidden rounded-lg bg-elevated text-base text-primary shadow-popover";

// A padded group of items between separators. `p-1` here is what insets items
// from the panel edge now that the panel itself has none.
export const menuSectionClass = "flex flex-col gap-px p-1";

export const menuItemClass =
  "flex min-h-[26px] cursor-default select-none items-center gap-2 rounded-md px-1.5 py-1 text-secondary outline-none data-[highlighted]:bg-tertiary data-[highlighted]:text-primary data-[disabled]:opacity-40";

// Menu-item look for plain (non-Radix) buttons — same metrics as menuItemClass
// with :hover standing in for Radix's data-[highlighted]. Used by surfaces that
// borrow menu styling outside a menu (e.g. the pinned-tabs island).
export const menuItemButtonClass =
  "flex min-h-[26px] w-full cursor-default select-none items-center gap-2 rounded-md px-1.5 py-1 text-left text-secondary outline-none hover:bg-tertiary hover:text-primary";

export const menuLabelClass =
  "px-[5px] py-px text-xs font-normal text-tertiary";

// Sits directly in the zero-padding panel, so the hairline spans edge to edge;
// the adjacent sections' `p-1` supplies the vertical breathing room around it.
export const menuSeparatorClass = "h-px bg-[var(--border-quaternary)]";

export const DropdownMenuContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, align = "start", ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={clsx(menuContentClass, className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item ref={ref} className={clsx(menuItemClass, className)} {...props} />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

// Checkbox item: same look as a radio item — trailing check when checked.
// Used for independent on/off rows (e.g. the settings menu's feature flags).
export const DropdownMenuCheckboxItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={clsx(menuItemClass, "justify-between", className)}
    {...props}
  >
    {children}
    <DropdownMenuPrimitive.ItemIndicator>
      <Icon name="check" size="base" color="primary" />
    </DropdownMenuPrimitive.ItemIndicator>
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

// Radio item: same row styling as a plain item, with a trailing check that only
// renders for the selected value. `justify-between` pins the check to the right
// edge so the label column stays aligned across items.
export const DropdownMenuRadioItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={clsx(menuItemClass, "justify-between", className)}
    {...props}
  >
    {children}
    <DropdownMenuPrimitive.ItemIndicator>
      <Icon name="check" size="base" color="primary" />
    </DropdownMenuPrimitive.ItemIndicator>
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

// Padded group of items; place `DropdownMenuSeparator` between sections.
export const DropdownMenuSection = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Group ref={ref} className={clsx(menuSectionClass, className)} {...props} />
));
DropdownMenuSection.displayName = "DropdownMenuSection";

export const DropdownMenuLabel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label ref={ref} className={clsx(menuLabelClass, className)} {...props} />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={clsx(menuSeparatorClass, className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
