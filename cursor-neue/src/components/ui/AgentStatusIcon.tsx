import clsx from "clsx";
import { AGENT_DOT_COLOR } from "@/lib/agentStatusVisual";
import type { AgentStatus } from "@/types";
import { DotGridLoader } from "./DotGridLoader";

export function AgentStatusIcon({
  status,
  className,
}: {
  status: AgentStatus;
  className?: string;
}) {
  switch (status) {
    case "running":
      return (
        <span
          className={clsx("inline-flex items-center justify-center", className)}
          aria-hidden
        >
          <DotGridLoader />
        </span>
      );
    case "attention":
    case "unread":
    case "idle":
      return (
        <span
          className={clsx("inline-flex items-center justify-center", className)}
          aria-hidden
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: AGENT_DOT_COLOR[status] }}
          />
        </span>
      );
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
