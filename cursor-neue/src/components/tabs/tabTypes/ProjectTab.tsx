import { useMemo, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import type { Node, NodeProps, NodeTypes } from "@xyflow/react";
import { Icon } from "@/components/ui/Icon";
import { AgentStatusIcon } from "@/components/ui/AgentStatusIcon";
import { EmptyTabSidebar } from "./placeholder";
import {
  CardHandles,
  ProjectBoardCanvas,
  canvasEdges,
  nodesFromClusters,
  placeHubNode,
  routeEdges,
  type CanvasCluster,
} from "./ProjectBoardCanvas";
import {
  AGENT_PARENT,
  PR_DEPENDS,
  TASK_DEPENDS,
  pairsFromDepends,
} from "@/data/boardLinks";
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
import { agentDisplayTitle } from "@/lib/agentDisplayName";
import { formatRelativeTime } from "@/lib/relativeTime";
import { taskTicketId } from "@/lib/taskTicketId";
import {
  AGENT_BOARD_STATUSES,
  AGENT_STATUS_LABEL,
  PROJECT_COLOR_STROKE,
  PROJECT_COLOR_WELL,
  agentsInProject,
  contentProjectId,
  isProject,
  isWorkspace,
  lastAgentReply,
  projectBoardAgentStatus,
  type Agent,
  type AgentStatus,
  type ProjectColor,
} from "@/types";
import { useWindowId } from "@/components/window/WindowContext";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { useActiveAgent, useWorkspaceStore } from "@/store/useWorkspaceStore";
import { ProjectBoardDoc } from "@/components/tabs/tabTypes/ProjectBoardDoc";
import { ProjectBoardEmpty } from "@/components/tabs/tabTypes/ProjectBoardEmpty";
import {
  workspaceBoardAgents,
  workspaceBoardPrs,
  workspaceBoardTasks,
  type BoardTask,
} from "@/lib/workspaceBoard";

type Surface = "tasks" | "agents" | "prs";
type BoardView = "columns" | "rows" | "doc" | "map";

/** Keep filled groups in their original order; send empty ones to the end. */
function emptyToEnd<T>(items: readonly T[], empty: (item: T) => boolean): T[] {
  const filled: T[] = [];
  const vacant: T[] = [];
  for (const item of items) (empty(item) ? vacant : filled).push(item);
  return [...filled, ...vacant];
}

/** Empty columns move last, but `pinned` stays at the end (Done). */
function emptyToEndPinned<T>(
  items: readonly T[],
  empty: (item: T) => boolean,
  pinned: T,
): T[] {
  return [...emptyToEnd(items.filter((item) => item !== pinned), empty), pinned];
}

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
      <AgentStatusIcon status={status} />
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
  const windowId = useWindowId();
  const openPrTab = useWorkspaceStore((s) => s.openPrTab);
  const namesMode = useFeatureFlags((s) => s.agentNames);
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
          <span className="min-w-0 truncate">{agentDisplayTitle(agent, namesMode)}</span>
        </button>
      )}
      {pr && (
        <button
          type="button"
          className={clsx(CHIP, "nodrag nopan hover:bg-quaternary hover:text-primary")}
          onClick={(e) => {
            e.stopPropagation();
            openPrTab(windowId, pr.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Icon
            name={prStateIcon(pr.state)}
            size="sm"
            color="inherit"
            style={{ color: prStateColor(pr.state) }}
          />
          <span className="min-w-0 truncate">#{pr.number}</span>
        </button>
      )}
    </span>
  );
}

const TASK_ID_ROW =
  "w-[56px] shrink-0 truncate text-base font-normal tabular-nums text-tertiary";
const TASK_ID_CARD =
  "pl-[calc(var(--board-lead)+var(--board-lead-gap))] text-sm font-medium text-tertiary";

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
  const windowId = useWindowId();
  const openContextFile = useWorkspaceStore((s) => s.openContextFile);
  const isRow = layout === "rows";
  const ticketId =
    useFeatureFlags((s) => s.docIds) === "ids" ? taskTicketId(projectId, task) : null;
  const done = task.status === "completed";
  const titleClass = clsx(
    "line-clamp-3 text-base",
    done ? "font-normal text-tertiary line-through" : "font-medium text-primary",
  );
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openContextFile(windowId, projectId, task.id)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        openContextFile(windowId, projectId, task.id);
      }}
      className={clsx(
        "flex w-full shrink-0 cursor-pointer px-[var(--board-inset)] text-left nodrag nopan",
        isRow
          ? "items-start gap-[var(--board-lead-gap)] rounded-lg py-[9px] hover:bg-quinary"
          : clsx("flex-col gap-1.5 py-2", CARD_SURFACE, CARD_HOVER_COLUMN),
      )}
    >
      {ticketId && !isRow && <span className={TASK_ID_CARD}>{ticketId}</span>}
      <div className="flex w-full min-w-0 items-start gap-[var(--board-lead-gap)]">
        <LeadSlot>
          <Icon name={taskStatusIcon(task.status)} size="sm" color="tertiary" />
        </LeadSlot>
        {isRow ? (
          <span className="flex min-w-0 flex-1 items-start gap-3">
            {ticketId && <span className={TASK_ID_ROW}>{ticketId}</span>}
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
  const namesMode = useFeatureFlags((s) => s.agentNames);
  const title = agentDisplayTitle(agent, namesMode);
  const preview = lastAgentReply(agent);
  const time = formatRelativeTime(agent.updatedAt);
  const isRow = layout === "rows";
  const pulsedAt = useUiStore((s) => s.joinedAgentPulseAt[agent.id]);
  const project = useWorkspaceStore((s) =>
    agent.projectId ? s.agents[agent.projectId] : undefined,
  );
  const wash =
    project && isProject(project)
      ? PROJECT_COLOR_STROKE[project.color ?? "blue"]
      : PROJECT_COLOR_STROKE.blue;
  const className = clsx(
    "relative flex w-full shrink-0 gap-[var(--board-lead-gap)] overflow-hidden px-[var(--board-inset)] text-left",
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
            {title}
          </span>
          {preview && (
            <span className="min-w-0 flex-1 truncate text-base text-secondary">{preview}</span>
          )}
          <span className="shrink-0 text-base text-tertiary">{time}</span>
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-base font-medium text-primary">{title}</span>
          {preview && <span className="line-clamp-2 text-sm text-secondary">{preview}</span>}
          <span className="text-sm text-tertiary">{time}</span>
        </span>
      )}
      {pulsedAt != null && (
        <span
          key={pulsedAt}
          aria-hidden
          className="agent-join-wash pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
          style={{ background: wash }}
        />
      )}
    </>
  );
  if (asDiv)
    return (
      <div className={className} data-agent-card={agent.id}>
        {body}
      </div>
    );
  return (
    <button type="button" data-agent-card={agent.id} onClick={onOpen} className={className}>
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
  const windowId = useWindowId();
  const openPrTab = useWorkspaceStore((s) => s.openPrTab);
  return (
    <button
      type="button"
      onClick={() => openPrTab(windowId, item.id)}
      className={clsx(
        "flex w-full shrink-0 gap-[var(--board-lead-gap)] px-[var(--board-inset)] text-left nodrag nopan",
        isRow
          ? "items-start rounded-lg py-[9px] hover:bg-quinary"
          : clsx("items-start py-2", CARD_SURFACE, CARD_HOVER_COLUMN),
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
    </button>
  );
}

type TaskMapData = { task: Task; projectId: string; onOpenAgent: (id: string) => void };
type AgentMapData = { agent: Agent };
type PrMapData = { item: PullRequest };
type HubMapData = { title: string; color: ProjectColor };

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

function ProjectHubNode({ data }: NodeProps<Node<HubMapData>>) {
  const stroke = PROJECT_COLOR_STROKE[data.color];
  return (
    <div
      className={clsx(
        CARD_SURFACE,
        "relative flex items-center justify-center px-3 py-2",
      )}
      style={{
        border: `1px solid color-mix(in oklab, ${stroke} 50%, transparent)`,
      }}
    >
      <CardHandles />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: `color-mix(in oklab, ${stroke} 10%, transparent)` }}
      />
      <span className="relative text-center text-2xl font-medium text-primary">
        {data.title}
      </span>
    </div>
  );
}

const MAP_NODE_TYPES: NodeTypes = {
  task: TaskMapNode,
  agent: AgentMapNode,
  pr: PrMapNode,
  projectHub: ProjectHubNode,
};

function BoardGroup({
  title,
  icon,
  iconColor,
  lead,
  layout,
  children,
}: {
  title: string;
  icon?: IconName;
  iconColor?: string;
  lead?: ReactNode;
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
          : "h-full w-[280px] shrink-0 rounded-xl bg-quinary dark:bg-chrome",
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
          {lead ??
            (icon ? (
              <Icon
                name={icon}
                size="sm"
                color="inherit"
                style={{ color: iconColor ?? "var(--icon-secondary)" }}
              />
            ) : null)}
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
  const surface = useUiStore((s) => s.projectBoardSurface);
  const setSurface = useUiStore((s) => s.setProjectBoardSurface);
  const view = useUiStore((s) => s.projectBoardView);
  const setView = useUiStore((s) => s.setProjectBoardView);
  const tasksOnly = useFeatureFlags((s) => s.projectSurface) === "tasks";
  const merged = useFeatureFlags((s) => s.sidebarSections) === "one";
  const boardSurface: Surface = tasksOnly ? "tasks" : surface;

  const workspaceOwner = agent && isWorkspace(agent) ? agent : undefined;
  const projectId = workspaceOwner ? null : agent ? contentProjectId(agent) : null;
  const project = workspaceOwner ?? (projectId ? agents[projectId] : undefined);
  const boardId = workspaceOwner?.id ?? projectId;
  const children = workspaceOwner
    ? workspaceBoardAgents(agents, agentOrder, workspaceOwner.id)
    : projectId
      ? agentsInProject(agents, agentOrder, projectId)
      : [];
  const prs = workspaceOwner
    ? workspaceBoardPrs(agents, agentOrder, workspaceOwner.id)
    : projectId
      ? pullRequestsFor(projectId)
      : [];
  const tasks: BoardTask[] = workspaceOwner
    ? workspaceBoardTasks(agents, agentOrder, workspaceOwner.id)
    : projectId
      ? tasksFor(projectId).map((task) => ({ ...task, projectId }))
      : [];

  const agentsByStatus = (status: AgentStatus): Agent[] =>
    children.filter((agent) => projectBoardAgentStatus(agent.status) === status);
  const prsByState = (state: PrState): PullRequest[] =>
    prs.filter((item) => item.state === state);
  const tasksByStatus = (status: TaskStatus): BoardTask[] =>
    tasks.filter((item) => item.status === status);
  const agentStatuses = emptyToEndPinned(
    AGENT_BOARD_STATUSES,
    (status) => agentsByStatus(status).length === 0,
    "idle",
  );
  const prStates = emptyToEnd(PR_BOARD_STATES, (state) => prsByState(state).length === 0);
  const taskStatuses = emptyToEndPinned(
    TASK_BOARD_STATUSES,
    (status) => tasksByStatus(status).length === 0,
    "completed",
  );

  const tasksEmpty = boardSurface === "tasks" && tasks.length === 0;

  const mapGraph = useMemo(() => {
    const openAgent = (agentId: string) => setActiveAgent(windowId, agentId);
    const mapChildren = children;
    const mapTasks = tasks;
    const mapPrs = prs;
    const mapAgentsByStatus = (status: AgentStatus) =>
      mapChildren.filter((child) => projectBoardAgentStatus(child.status) === status);
    const mapPrsByState = (state: PrState) => mapPrs.filter((item) => item.state === state);
    const mapTasksByStatus = (status: TaskStatus) =>
      mapTasks.filter((task) => task.status === status);
    const mapAgentStatuses = emptyToEndPinned(
      AGENT_BOARD_STATUSES,
      (status) => mapAgentsByStatus(status).length === 0,
      "idle",
    );
    const mapPrStates = emptyToEnd(PR_BOARD_STATES, (state) => mapPrsByState(state).length === 0);
    const mapTaskStatuses = emptyToEndPinned(
      TASK_BOARD_STATUSES,
      (status) => mapTasksByStatus(status).length === 0,
      "completed",
    );
    let clusters: CanvasCluster[] = [];
    switch (boardSurface) {
      case "tasks":
        clusters = mapTaskStatuses.map((status) => ({
          id: status,
          title: TASK_STATUS_LABEL[status],
          items: mapTasksByStatus(status).map((task) => ({
            id: task.id,
            type: "task",
            data: { task, projectId: task.projectId, onOpenAgent: openAgent },
          })),
        }));
        break;
      case "agents":
        clusters = mapAgentStatuses.map((status) => ({
          id: status,
          title: AGENT_STATUS_LABEL[status],
          items: mapAgentsByStatus(status).map((child) => ({
            id: child.id,
            type: "agent",
            data: { agent: child },
          })),
        }));
        break;
      case "prs":
        clusters = mapPrStates.map((state) => ({
          id: state,
          title: PR_STATE_LABEL[state],
          items: mapPrsByState(state).map((item) => ({
            id: item.id,
            type: "pr",
            data: { item },
          })),
        }));
        break;
      default: {
        const _exhaustive: never = boardSurface;
        return _exhaustive;
      }
    }
    let nodes = nodesFromClusters(clusters);
    let pairs: { source: string; target: string }[] = [];
    switch (boardSurface) {
      case "tasks":
        pairs = pairsFromDepends(TASK_DEPENDS, new Set(mapTasks.map((task) => task.id)));
        break;
      case "prs":
        pairs = pairsFromDepends(PR_DEPENDS, new Set(mapPrs.map((item) => item.id)));
        break;
      case "agents": {
        if (project && (isProject(project) || isWorkspace(project))) {
          const hubId = `hub:${project.id}`;
          nodes = placeHubNode(nodes, {
            id: hubId,
            type: "projectHub",
            data: {
              title: project.title,
              color: project.color ?? "blue",
            },
            position: { x: 0, y: 0 },
          });
          const childIds = new Set(mapChildren.map((child) => child.id));
          for (const child of mapChildren) {
            const parent = AGENT_PARENT[child.id];
            if (parent && childIds.has(parent)) {
              pairs.push({ source: parent, target: child.id });
            } else {
              pairs.push({ source: hubId, target: child.id });
            }
          }
        }
        break;
      }
      default: {
        const _exhaustive: never = boardSurface;
        return _exhaustive;
      }
    }
    return { nodes, edges: routeEdges(canvasEdges(pairs), nodes) };
  }, [boardSurface, children, prs, project, setActiveAgent, tasks, windowId]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-editor">
      {!tasksEmpty && view === "map" && (
        <div className="absolute inset-0">
          <ProjectBoardCanvas
            key={`${boardId ?? "none"}-${boardSurface}`}
            nodes={mapGraph.nodes}
            edges={mapGraph.edges}
            nodeTypes={MAP_NODE_TYPES}
            onOpenNode={
              boardSurface === "agents"
                ? (id) => {
                    if (id.startsWith("hub:")) return;
                    setActiveAgent(windowId, id);
                  }
                : undefined
            }
          />
        </div>
      )}
      <div
        className={clsx(
          "flex items-center justify-between px-3 py-4",
          view === "map" ? "pointer-events-none relative z-10" : "shrink-0",
        )}
      >
        <div className={view === "map" ? "pointer-events-auto" : undefined}>
          {tasksOnly ? (
            view === "doc" ? (
              <div />
            ) : (
            <div className="flex min-w-0 items-center gap-2">
              {project && (
                <span
                  aria-hidden
                  className={clsx(
                    "flex size-[30px] shrink-0 items-center justify-center rounded-[6px]",
                    PROJECT_COLOR_WELL[project.color ?? "blue"],
                  )}
                >
                  <Icon
                    name={project.icon ?? "pencil"}
                    size="lg"
                    color="inherit"
                    style={{ color: PROJECT_COLOR_STROKE[project.color ?? "blue"] }}
                  />
                </span>
              )}
              <p className="min-w-0 truncate text-lg font-medium text-primary">
                {project?.title ?? ""}
              </p>
            </div>
            )
          ) : (
            <Segmented
              label={merged ? "Tracker surface" : "Project surface"}
              value={surface}
              onSelect={setSurface}
              options={[
                { id: "tasks", label: "Tasks" },
                { id: "agents", label: "Agents" },
                { id: "prs", label: "PRs" },
              ]}
            />
          )}
        </div>
        {!tasksEmpty && (
          <div className={view === "map" ? "pointer-events-auto" : undefined}>
            <Segmented
              label="Board layout"
              value={view}
              onSelect={setView}
              options={[
                { id: "columns", icon: "menu", iconClassName: "rotate-90" },
                { id: "rows", icon: "menu" },
                { id: "doc", icon: "file-text" },
                { id: "map", icon: "map" },
              ]}
            />
          </div>
        )}
      </div>
      {tasksEmpty ? (
        <ProjectBoardEmpty title={project?.title} />
      ) : view === "doc" ? (
        <ProjectBoardDoc
          sourceKey={`${boardId ?? "none"}-${boardSurface}-code-ids`}
          surface={boardSurface}
          projectId={boardId ?? undefined}
          projectTitle={project?.title ?? ""}
          projectBrief={project?.description}
          projectIcon={
            project
              ? isWorkspace(project)
                ? "folder"
                : (project.icon ?? "pencil")
              : undefined
          }
          projectColor={
            project && !isWorkspace(project) ? (project.color ?? "blue") : "default"
          }
          tasks={tasks}
          agents={children}
          prs={prs}
        />
      ) : null}
      {!tasksEmpty && view !== "map" && view !== "doc" && (
      <div
        className={clsx(
          "min-h-0 flex-1 select-none",
          view === "rows"
            ? "overflow-y-auto overflow-x-hidden"
            : "overflow-x-auto overflow-y-hidden",
        )}
      >
        <div
          className={clsx(
            "flex gap-2 px-3 pb-2",
            view === "rows" ? "flex-col" : "h-full",
          )}
        >
          {(() => {
            const listView = view === "rows" ? "rows" : "columns";
            switch (boardSurface) {
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
                        projectId={item.projectId}
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
                    lead={<AgentStatusIcon status={status} />}
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
                const _exhaustive: never = boardSurface;
                return _exhaustive;
              }
            }
          })()}
        </div>
      </div>
      )}
    </div>
  );
}

export const ProjectSidebar = () => <EmptyTabSidebar />;
