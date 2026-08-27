import type { ReactElement } from "react";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";

/** Workspace names in sidebar order. Unknown ids keep their id as the label. */
export function workspaceNamesInOrder(
  ids: Iterable<string>,
  workspaceOrder: string[],
  workspaces: Record<string, { name?: string }>,
): string[] {
  const set = ids instanceof Set ? ids : new Set(ids);
  return workspaceOrder.filter((id) => set.has(id)).map((id) => workspaces[id]?.name ?? id);
}

/** Right-side hover list of workspaces. Used on project rows only. */
export function SidebarWorkspaceTooltip({
  names,
  children,
}: {
  names: string[];
  children: ReactElement;
}) {
  return (
    <Tooltip
      side="right"
      align="start"
      delay={400}
      className="rounded-xl border border-secondary p-3"
      content={
        names.length > 0 ? (
          <div className="flex flex-col gap-2">
            {names.map((name) => (
              <div key={name} className="flex min-h-4 items-center gap-1.5 text-sm">
                <Icon name="book" size="base" color="secondary" />
                {name}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-4 items-center gap-1.5 text-sm">
            <Icon name="book" size="base" color="secondary" />
            No workspaces
          </div>
        )
      }
    >
      {children}
    </Tooltip>
  );
}
