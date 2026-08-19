import { Icon, type IconName } from "./Icon";
import { LeadingBadge } from "./LeadingBadge";

export interface NavAction {
  icon: IconName;
  label: string;
  onClick?: () => void;
}

/** 44px circular toolbar button (iOS-style), tinted off the screen bg. */
export function CircleIconButton({ icon, label, onClick }: NavAction) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="border-gradient-subtle flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-quaternary transition-colors duration-fast hover:bg-tertiary"
    >
      <Icon name={icon} size="lg" color="primary" />
    </button>
  );
}

/** Mobile navigation bar: circular action buttons in the leading/trailing
 *  slots, with an optional centered identity (badge stacked over the title,
 *  like the mock's agent header). */
export function MobileNavBar({
  leading = [],
  trailing = [],
  title,
  subtitle,
  badge,
}: {
  leading?: NavAction[];
  trailing?: NavAction[];
  title?: string;
  /** Muted context line under the title (parent chat's name). */
  subtitle?: string;
  badge?: { shape: "chiclet" | "circle" | "face"; icon?: IconName };
}) {
  return (
    <div className="relative z-10 flex shrink-0 items-start justify-between gap-2 px-3 pb-2 pt-3">
      <div className="flex gap-2">
        {leading.map((action) => (
          <CircleIconButton key={action.label} {...action} />
        ))}
      </div>
      {title && (
        <div className="pointer-events-none absolute inset-x-16 top-3 flex min-h-11 flex-col items-center justify-center gap-0.5">
          {badge && <LeadingBadge shape={badge.shape} icon={badge.icon} label={title} />}
          <span className="max-w-full truncate text-sm font-medium text-primary">{title}</span>
          {subtitle && !badge && (
            <span className="max-w-full truncate text-xs text-tertiary">{subtitle}</span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        {trailing.map((action) => (
          <CircleIconButton key={action.label} {...action} />
        ))}
      </div>
    </div>
  );
}
