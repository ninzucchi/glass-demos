import type { AgentStatus } from "@/types";

/** Status dots on Kanban agent rows and document agent links. */
export const AGENT_DOT_COLOR: Record<AgentStatus, string> = {
  attention: "var(--orange)",
  unread: "var(--blue)",
  running: "var(--icon-secondary)",
  idle: "var(--icon-quaternary)",
};

export function isAgentStatus(value: unknown): value is AgentStatus {
  return value === "idle" || value === "running" || value === "attention" || value === "unread";
}
