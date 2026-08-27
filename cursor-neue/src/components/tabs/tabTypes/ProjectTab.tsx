import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import type { Node, NodeProps, NodeTypes } from "@xyflow/react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { EmptyTabSidebar } from "./placeholder";
import {
  CardHandles,
  ProjectBoardCanvas,
  nodesFromClusters,
  type CanvasCluster,
} from "./ProjectBoardCanvas";
import {
  PR_BOARD_STATES,
  PR_STATE_LABEL,
  prReviewLabel,
  prStateColor,
  prStateIcon,
  pullRequestsFor,
  type PrState,
  type PullRequest,
} from "@/data/pullRequests";
import {
  TASK_BOARD_STATUSES,
  TASK_STATUS_LABEL,
  tasksFor,
  taskStatusIcon,
  type Task,
  type TaskStatus,
} from "@/data/tasks";
import { formatRelativeTime } from "@/lib/relativeTime";
import {
  AGENT_BOARD_STATUSES,
  AGENT_STATUS_LABEL,
  agentsInProject,
  contentProjectId,
  lastAgentReply,
  type Agent,
  type AgentStatus,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useActiveAgent, useWorkspaceStore } from "@/store/useWorkspaceStore";

type Surface = "tasks" | "agents" | "prs";
type BoardView = "columns" | "rows" | "map";

/** Keep filled groups in their original order; send empty ones to the end. */
function emptyToEnd<T>(items: readonly T[], empty: (item: T) => boolean): T[] {
  const filled: T[] = [];
  const vacant: T[] = [];
  for (const item of items) (empty(item) ? vacant : filled).push(item);
  return [...filled, ...vacant];
}

const AGENT_STATUS_ICON: Record<AgentStatus, IconName> = {
  attention: "exclamation-circle",
  unread: "bell",
  running: "spinner",
  idle: "check-circle",
};

const AGENT_DOT_COLOR: Record<AgentStatus, string> = {
  attention: "var(--orange)",
  unread: "var(--blue)",
  running: "var(--icon-secondary)",
  idle: "var(--icon-quaternary)",
};

function Segmented<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: { id: T; label?: string; icon?: IconName; iconClassName?: string; disabled?: boolean }[];
  onSelect: (id: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center gap-px rounded-full border border-secondary bg-elevated p-0.5"
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => onSelect(option.id)}
            className={clsx(
              "flex h-6 items-center justify-center rounded-full px-2 text-sm transition-colors duration-base",
              selected ? "bg-tertiary text-primary" : "text-tertiary hover:text-secondary",
              option.disabled && "cursor-default opacity-50 hover:text-tertiary",
            )}
          >
            {option.icon ? (
              <Icon
                name={option.icon}
                size="sm"
                color="inherit"
                className={clsx(selected && "text-primary", option.iconClassName)}
              />
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );
}

const CARD_SURFACE =
  "relative rounded-xl bg-elevated shadow-[lch(0_0_0/0.088)_0px_0px_0px_0.5px,lch(0_0_0/0.02)_0px_3px_6px_-2px,lch(0_0_0/0.04)_0px_1px_1px_0px] dark:shadow-[0_1px_2px_var(--shadow-tertiary)] dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:rounded-[inherit] dark:before:shadow-[inset_0_0_0_0.5px_var(--border-tertiary)] dark:before:content-['']";

const CARD_HOVER_COLUMN =
  "hover:bg-[color-mix(in_oklab,var(--base)_2%,var(--bg-elevated))]";

/** Shared lead: header and cards use the same inset, icon slot, and gap so
 *  the icon column and the title edge stay on one vertical line. Column mode
 *  adds a gutter around the card stack; header inset is gutter + inset. */
const BOARD_INSET_PX = 8;
const BOARD_LEAD_PX = 18;
const BOARD_LEAD_GAP_PX = 8;

function boardMetrics(): CSSProperties {
  return {
    "--board-gutter": `${BOARD_INSET_PX}px`,
    "--board-inset": `${BOARD_INSET_PX}px`,
    "--board-lead": `${BOARD_LEAD_PX}px`,
    "--board-lead-gap": `${BOARD_LEAD_GAP_PX}px`,
  };
}

function LeadSlot({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-[var(--board-lead)] shrink-0 items-center justify-center">
      {children}
    </span>
  );
}

function AgentLeading({ status }: { status: AgentStatus }) {
  return (
    <LeadSlot>
      {status === "running" ? (
        <Icon name="spinner" size="sm" color="secondary" />
      ) : (
        <span className="size-1.5 rounded-full" style={{ background: AGENT_DOT_COLOR[status] }} />
      )}
    </LeadSlot>
  );
}

const CHIP =
  "inline-flex h-[22px] max-w-full items-center gap-1 rounded-full border border-secondary px-2 text-sm text-secondary";

function TaskChips({
  task,
  projectId,
  onOpenAgent,
  className,
}: {
  task: Task;
  projectId: string;
  onOpenAgent: (agentId: string) => void;
  className?: string;
}) {
  const agent = useWorkspaceStore((s) => (task.agentId ? s.agents[task.agentId] : undefined));
  const pr = task.prId
    ? pullRequestsFor(projectId).find((item) => item.id === task.prId)
    : undefined;
  if (!agent && !pr) return null;
  return (
    <span className={clsx("flex flex-wrap gap-1", className)}>
      {agent && (
        <button
          type="button"
          className={clsx(CHIP, "nodrag nopan hover:bg-quaternary hover:text-primary")}
          onClick={(e) => {
            e.stopPropagation();
            onOpenAgent(agent.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Icon name="agent" size="sm" color="inherit" />
          <span className="min-w-0 truncate">{agent.title}</span>
        </button>
      )}
      {pr && (
        <span className={CHIP}>
          <Icon
            name={prStateIcon(pr.state)}
            size="sm"
            color="inherit"
            style={{ color: prStateColor(pr.state) }}
          />
          <span className="min-w-0 truncate">#{pr.number}</span>
        </span>
      )}
    </span>
  );
}

function TaskCard({
  task,
  projectId,
  layout,
  onOpenAgent,
}: {
  task: Task;
  projectId: string;
  layout: BoardView;
  onOpenAgent: (agentId: string) => void;
}) {
  const isRow = layout === "rows";
  const done = task.status === "completed";
  const titleClass = clsx(
    "line-clamp-3 text-base",
    done ? "font-normal text-tertiary line-through" : "font-medium text-primary",
  );
  return (
    <div
      className={clsx(
        "flex w-full gap-[var(--board-lead-gap)] px-[var(--board-inset)]",
        isRow ? "items-start rounded-lg py-[9px]" : clsx("items-start py-2", CARD_SURFACE),
      )}
    >
      <LeadSlot>
        <Icon name={taskStatusIcon(task.status)} size="sm" color="tertiary" />
      </LeadSlot>
      {isRow ? (
        <span className="flex min-w-0 flex-1 items-start gap-3">
          <span className={clsx("min-w-0 flex-1", titleClass)}>{task.title}</span>
          <TaskChips
            task={task}
            projectId={projectId}
            onOpenAgent={onOpenAgent}
            className="max-w-[45%] shrink-0 justify-end"
          />
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={titleClass}>{task.title}</span>
          <TaskChips task={task} projectId={projectId} onOpenAgent={onOpenAgent} className="mt-1" />
        </span>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  layout,
  onOpen,
  asDiv = false,
}: {
  agent: Agent;
  layout: BoardView;
  onOpen: () => void;
  asDiv?: boolean;
}) {
  const preview = lastAgentReply(agent);
  const time = formatRelativeTime(agent.updatedAt);
  const isRow = layout === "rows";
  const className = clsx(
    "flex w-full gap-[var(--board-lead-gap)] px-[var(--board-inset)] text-left",
    isRow
      ? "items-center rounded-lg py-[9px] hover:bg-quinary"
      : clsx("items-start py-2", CARD_SURFACE, CARD_HOVER_COLUMN),
  );
  const body = (
    <>
      <AgentLeading status={agent.status} />
      {isRow ? (
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="max-w-[45%] shrink-0 truncate text-base font-medium text-primary">
            {agent.title}
          </span>
          {preview && (
            <span className="min-w-0 flex-1 truncate text-base text-secondary">{preview}</span>
          )}
          <span className="shrink-0 text-base text-tertiary">{time}</span>
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-base font-medium text-primary">{agent.title}</span>
          {preview && <span className="line-clamp-2 text-sm text-secondary">{preview}</span>}
          <span className="text-sm text-tertiary">{time}</span>
        </span>
      )}
    </>
  );
  if (asDiv) return <div className={className}>{body}</div>;
  return (
    <button type="button" onClick={onOpen} className={className}>
      {body}
    </button>
  );
}

function PrMeta({
  item,
  size,
  statusFirst = false,
}: {
  item: PullRequest;
  size: "sm" | "base";
  statusFirst?: boolean;
}) {
  const review =
    (item.state === "draft" || item.state === "open") && item.reviewStatus
      ? item.reviewStatus
      : null;
  const time = <span>{formatRelativeTime(item.openedAt)}</span>;
  const status = review ? <span>{prReviewLabel(review)}</span> : null;
  return (
    <span className={clsx("shrink-0 text-tertiary", size === "base" ? "text-base" : "text-sm")}>
      {status && statusFirst ? (
        <>
          {status}
          <span> · </span>
          {time}
        </>
      ) : (
        <>
          {time}
          {status && (
            <>
              <span> · </span>
              {status}
            </>
          )}
        </>
      )}
    </span>
  );
}

function PrCard({ item, layout }: { item: PullRequest; layout: BoardView }) {
  const isRow = layout === "rows";
  return (
    <div
      className={clsx(
        "flex w-full gap-[var(--board-lead-gap)] px-[var(--board-inset)]",
        isRow ? "items-start rounded-lg py-[9px]" : clsx("items-start py-2", CARD_SURFACE),
      )}
    >
      <LeadSlot>
        <Icon
          name={prStateIcon(item.state)}
          size="sm"
          color="inherit"
          style={{ color: prStateColor(item.state) }}
        />
      </LeadSlot>
      {isRow ? (
        <span className="flex min-w-0 flex-1 items-start gap-3">
          <span className="min-w-0 flex-1 line-clamp-3 text-base font-medium text-primary">
            {item.title}
          </span>
          <PrMeta item={item} size="base" statusFirst />
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-3 text-base font-medium text-primary">{item.title}</span>
          <PrMeta item={item} size="sm" />
        </span>
      )}
    </div>
  );
}

type TaskMapData = { task: Task; projectId: string; onOpenAgent: (id: string) => void };
type AgentMapData = { agent: Agent };
type PrMapData = { item: PullRequest };

function TaskMapNode({ data }: NodeProps<Node<TaskMapData>>) {
  return (
    <div style={boardMetrics()}>
      <CardHandles />
      <TaskCard
        task={data.task}
        projectId={data.projectId}
        layout="columns"
        onOpenAgent={data.onOpenAgent}
      />
    </div>
  );
}

function AgentMapNode({ data }: NodeProps<Node<AgentMapData>>) {
  return (
    <div style={boardMetrics()}>
      <CardHandles />
      <AgentCard agent={data.agent} layout="columns" onOpen={() => undefined} asDiv />
    </div>
  );
}

function PrMapNode({ data }: NodeProps<Node<PrMapData>>) {
  return (
    <div style={boardMetrics()}>
      <CardHandles />
      <PrCard item={data.item} layout="columns" />
    </div>
  );
}

const MAP_NODE_TYPES: NodeTypes = {
  task: TaskMapNode,
  agent: AgentMapNode,
  pr: PrMapNode,
};

function BoardGroup({
  title,
  icon,
  iconColor,
  layout,
  children,
}: {
  title: string;
  icon: IconName;
  iconColor?: string;
  layout: BoardView;
  children: ReactNode;
}) {
  const isRow = layout === "rows";
  return (
    <section
      className={clsx(
        "flex flex-col pt-0.5",
        isRow
          ? "w-full gap-0.5"
          : "h-full w-[300px] shrink-0 rounded-xl bg-quinary dark:bg-chrome",
      )}
      style={boardMetrics()}
    >
      <header
        className={clsx(
          "flex shrink-0 items-center gap-[var(--board-lead-gap)] py-2",
          "pl-[calc(var(--board-gutter)+var(--board-inset))] pr-[calc(var(--board-gutter)+var(--board-inset))]",
          isRow && "rounded-lg bg-quinary",
        )}
      >
        <LeadSlot>
          <Icon
            name={icon}
            size="sm"
            color="inherit"
            style={{ color: iconColor ?? "var(--icon-secondary)" }}
          />
        </LeadSlot>
        <span className="text-base font-medium text-primary">{title}</span>
      </header>
      <div
        className={clsx(
          "flex flex-col px-[var(--board-gutter)]",
          isRow ? "gap-0.5" : "min-h-0 flex-1 gap-2 overflow-y-auto pb-2 pt-0.5",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function ProjectContent() {
  const windowId = useWindowId();
  const agent = useActiveAgent();
  const agents = useWorkspaceStore((s) => s.agents);
  const agentOrder = useWorkspaceStore((s) => s.agentOrder);
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  const [surface, setSurface] = useState<Surface>("tasks");
  const [view, setView] = useState<BoardView>("columns");

  const projectId = agent ? contentProjectId(agent) : null;
  const children = projectId ? agentsInProject(agents, agentOrder, projectId) : [];
  const prs = projectId ? pullRequestsFor(projectId) : [];
  const tasks = projectId ? tasksFor(projectId) : [];

  const agentsByStatus = (status: AgentStatus): Agent[] =>
    children.filter((agent) => agent.status === status);
  const prsByState = (state: PrState): PullRequest[] =>
    prs.filter((item) => item.state === state);
  const tasksByStatus = (status: TaskStatus): Task[] =>
    tasks.filter((item) => item.status === status);
  const agentStatuses = emptyToEnd(AGENT_BOARD_STATUSES, (status) => agentsByStatus(status).length === 0);
  const prStates = emptyToEnd(PR_BOARD_STATES, (state) => prsByState(state).length === 0);
  const taskStatuses = emptyToEnd(TASK_BOARD_STATUSES, (status) => tasksByStatus(status).length === 0);

  const mapNodes = useMemo(() => {
    const openAgent = (agentId: string) => setActiveAgent(windowId, agentId);
    let clusters: CanvasCluster[] = [];
    switch (surface) {
      case "tasks":
        clusters = taskStatuses.map((status) => ({
          id: status,
          title: TASK_STATUS_LABEL[status],
          items: tasksByStatus(status).map((task) => ({
            id: task.id,
            type: "task",
            data: { task, projectId: projectId ?? "", onOpenAgent: openAgent },
          })),
        }));
        break;
      case "agents":
        clusters = agentStatuses.map((status) => ({
          id: status,
          title: AGENT_STATUS_LABEL[status],
          items: agentsByStatus(status).map((child) => ({
            id: child.id,
            type: "agent",
            data: { agent: child },
          })),
        }));
        break;
      case "prs":
        clusters = prStates.map((state) => ({
          id: state,
          title: PR_STATE_LABEL[state],
          items: prsByState(state).map((item) => ({
            id: item.id,
            type: "pr",
            data: { item },
          })),
        }));
        break;
      default: {
        const _exhaustive: never = surface;
        return _exhaustive;
      }
    }
    return nodesFromClusters(clusters);
  }, [
    agentStatuses,
    agents,
    agentOrder,
    children,
    prs,
    prStates,
    projectId,
    setActiveAgent,
    surface,
    taskStatuses,
    tasks,
    windowId,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-editor">
      <div className="flex shrink-0 items-center justify-between px-3 py-4">
        <Segmented
          label="Project surface"
          value={surface}
          onSelect={setSurface}
          options={[
            { id: "tasks", label: "Tasks" },
            { id: "agents", label: "Agents" },
            { id: "prs", label: "PRs" },
          ]}
        />
        <Segmented
          label="Board layout"
          value={view}
          onSelect={setView}
          options={[
            { id: "columns", icon: "menu", iconClassName: "rotate-90" },
            { id: "rows", icon: "menu" },
            { id: "map", icon: "map" },
          ]}
        />
      </div>
      <div
        className={clsx(
          "min-h-0 flex-1",
          view === "rows"
            ? "overflow-y-auto overflow-x-hidden"
            : view === "map"
              ? "overflow-hidden"
              : "overflow-x-auto overflow-y-hidden",
        )}
      >
        {view === "map" ? (
          <ProjectBoardCanvas
            key={`${projectId ?? "none"}-${surface}`}
            nodes={mapNodes}
            nodeTypes={MAP_NODE_TYPES}
            onOpenNode={
              surface === "agents"
                ? (id) => setActiveAgent(windowId, id)
                : undefined
            }
          />
        ) : (
        <div
          className={clsx(
            "flex gap-2 px-3 pb-2",
            view === "rows" ? "flex-col" : "h-full",
          )}
        >
          {(() => {
            const listView = view === "rows" ? "rows" : "columns";
            switch (surface) {
              case "tasks":
                return taskStatuses.map((status) => (
                  <BoardGroup
                    key={status}
                    layout={listView}
                    title={TASK_STATUS_LABEL[status]}
                    icon={taskStatusIcon(status)}
                  >
                    {tasksByStatus(status).map((item) => (
                      <TaskCard
                        key={item.id}
                        task={item}
                        projectId={projectId ?? ""}
                        layout={listView}
                        onOpenAgent={(agentId) => setActiveAgent(windowId, agentId)}
                      />
                    ))}
                  </BoardGroup>
                ));
              case "agents":
                return agentStatuses.map((status) => (
                  <BoardGroup
                    key={status}
                    layout={listView}
                    title={AGENT_STATUS_LABEL[status]}
                    icon={AGENT_STATUS_ICON[status]}
                  >
                    {agentsByStatus(status).map((agent) => (
                      <AgentCard
                        key={agent.id}
                        layout={listView}
                        agent={agent}
                        onOpen={() => setActiveAgent(windowId, agent.id)}
                      />
                    ))}
                  </BoardGroup>
                ));
              case "prs":
                return prStates.map((state) => (
                  <BoardGroup
                    key={state}
                    layout={listView}
                    title={PR_STATE_LABEL[state]}
                    icon={prStateIcon(state)}
                  >
                    {prsByState(state).map((item) => (
                      <PrCard key={item.id} layout={listView} item={item} />
                    ))}
                  </BoardGroup>
                ));
              default: {
                const _exhaustive: never = surface;
                return _exhaustive;
              }
            }
          })()}
        </div>
        )}
      </div>
    </div>
  );
}

export const ProjectSidebar = () => <EmptyTabSidebar />;
