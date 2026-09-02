import type { Tab } from "@/types";
import { IconButton } from "@/components/ui/IconButton";
import {
  PR_STATE_BADGE,
  prBranchName,
  pullRequestById,
  type PrState,
} from "@/data/pullRequests";

function statusBadgeClass(state: PrState): string {
  switch (state) {
    case "open":
      return "bg-green-secondary text-green";
    case "merged":
      return "bg-purple-secondary text-purple";
    case "closed":
      return "bg-red-secondary text-red";
    case "draft":
      return "bg-tertiary text-secondary";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function PrStatusBadge({ state }: { state: PrState }) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2.5 text-xs font-medium ${statusBadgeClass(state)}`}
    >
      {PR_STATE_BADGE[state]}
    </span>
  );
}

/** PR instance tab. Header only — no file tree, no filled body. */
export function PrContent({ tab }: { tab: Tab; tileId: string }) {
  const pr = tab.prId ? pullRequestById(tab.prId) : undefined;
  if (!pr) {
    return (
      <div className="h-full w-full bg-editor px-6 py-5 text-base text-tertiary">
        Pull request not found.
      </div>
    );
  }

  const copyTitle = () => {
    void navigator.clipboard.writeText(`${pr.title} #${pr.number}`);
  };

  return (
    <div className="h-full w-full bg-editor px-6 py-5">
      <div className="flex w-full flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <PrStatusBadge state={pr.state} />
            <span className="truncate text-sm text-secondary">
              {prBranchName(pr)} → main
            </span>
          </div>
          <div className="flex shrink-0 items-center">
            <IconButton name="dots-3-horizontal" size="base" color="tertiary" aria-label="More" />
            <IconButton name="logo-github" size="base" color="tertiary" aria-label="Open on GitHub" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <h1 className="text-2xl font-medium text-primary">
            {pr.title}{" "}
            <span className="text-secondary">#{pr.number}</span>
          </h1>
          <div className="flex shrink-0 items-center">
            <IconButton name="copy" size="base" color="tertiary" aria-label="Copy title" onClick={copyTitle} />
            <IconButton name="pencil" size="base" color="tertiary" aria-label="Edit title" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrSidebar() {
  return null;
}
