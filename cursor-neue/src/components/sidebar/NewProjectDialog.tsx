import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "motion/react";
import { ProjectBadge } from "@/components/chat/ProjectBadge";
import { ProjectIconPicker } from "@/components/sidebar/ProjectIconPicker";
import { Icon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSection,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { finishPendingMoveToProject } from "@/components/sidebar/sidebarAgentSelection";
import { PROJECT_MODELS } from "@/data/models";
import {
  DEFAULT_WORKSPACE_ID,
  isProject,
  primaryWorkspaceId,
  type ProjectColor,
} from "@/types";
import type { IconName } from "@/icons/iconNames";
import { useWindowId } from "@/components/window/WindowContext";
import { useMergedSidebar } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const FIELD =
  "flex w-full items-center gap-2 rounded-lg border border-secondary bg-quaternary px-2 py-2 text-base text-primary outline-none";

/** Overlay and panel share this timing so they read as one unit. */
const DIALOG_EASE = [0.25, 1, 0.5, 1] as const;

/** Create-project dialog. Scrim stays inside the window, same as Customize. */
export function NewProjectDialog() {
  const windowId = useWindowId();
  const open = useUiStore((s) => s.newProjectWindowId === windowId);
  const close = useUiStore((s) => s.closeNewProject);
  const editingProjectId = useUiStore((s) => s.editingProjectId);
  const pendingMoveAgentIds = useUiStore((s) => s.pendingMoveAgentIds);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const saveProject = useWorkspaceStore((s) => s.saveProject);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<IconName>("agent");
  const [color, setColor] = useState<ProjectColor>("default");
  const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
  const [model, setModel] = useState<(typeof PROJECT_MODELS)[number]>(PROJECT_MODELS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [baseline, setBaseline] = useState<{
    title: string;
    icon: IconName;
    color: ProjectColor;
    workspaceId: string;
  } | null>(null);
  const merged = useMergedSidebar();
  const reduceMotion = useReducedMotion();
  const dialogTransition = {
    duration: reduceMotion ? 0 : 0.2,
    ease: DIALOG_EASE,
  };

  const reset = () => {
    setTitle("");
    setIcon("agent");
    setColor("default");
    setWorkspaceId(DEFAULT_WORKSPACE_ID);
    setModel(PROJECT_MODELS[0]);
    setPickerOpen(false);
    setBaseline(null);
  };

  useEffect(() => {
    if (!open) return;
    if (editingProjectId) {
      const project = useWorkspaceStore.getState().agents[editingProjectId];
      if (project && isProject(project)) {
        const next = {
          title: project.title,
          icon: (project.icon ?? "pencil") as IconName,
          color: project.color ?? "blue",
          workspaceId: primaryWorkspaceId(project),
        };
        setTitle(next.title);
        setIcon(next.icon);
        setColor(next.color);
        setWorkspaceId(next.workspaceId);
        setModel(PROJECT_MODELS[0]);
        setPickerOpen(false);
        setBaseline(next);
      }
      return;
    }
    setBaseline(null);
    const pendingId = pendingMoveAgentIds?.[0];
    if (pendingId) {
      const source = useWorkspaceStore.getState().agents[pendingId];
      if (source) setWorkspaceId(primaryWorkspaceId(source));
    }
  }, [editingProjectId, open, pendingMoveAgentIds]);

  const dirty =
    !!baseline &&
    (title !== baseline.title ||
      icon !== baseline.icon ||
      color !== baseline.color ||
      workspaceId !== baseline.workspaceId);

  const submit = () => {
    if (editingProjectId) {
      if (!dirty) return;
      saveProject(editingProjectId, { title, workspaceId, icon, color });
      close();
      reset();
      return;
    }
    const projectId = createProject(windowId, {
      title,
      workspaceId,
      icon,
      color,
    });
    if (projectId) finishPendingMoveToProject(windowId, projectId);
    close();
    reset();
  };

  if (!open) return null;

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) {
          close();
          reset();
        }
      }}
    >
      <Dialog.Overlay asChild>
        <motion.div
          data-no-drag
          className="absolute inset-0 z-modal bg-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={dialogTransition}
        />
      </Dialog.Overlay>
      <Dialog.Content
        data-no-drag
        aria-describedby={undefined}
        className="absolute left-1/2 top-1/2 z-modal -translate-x-1/2 -translate-y-1/2 outline-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.995 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={dialogTransition}
          className="w-[340px] rounded-[20px] bg-elevated shadow-window will-change-transform"
        >
          <form
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Dialog.Title className="sr-only">
              {editingProjectId
                ? merged
                  ? "Edit group"
                  : "Edit project"
                : merged
                  ? "Create group"
                  : "Create project"}
            </Dialog.Title>
            <div className="flex flex-col items-center gap-5 px-4 pb-4 pt-6">
              <DropdownMenu modal={false} open={pickerOpen} onOpenChange={setPickerOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={merged ? "Edit group icon" : "Edit project icon"}
                  >
                    <ProjectBadge color={color} icon={icon} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  portalled={false}
                  align="center"
                  side="bottom"
                  className="z-[700] !min-w-0 overflow-hidden !rounded-[12px] border border-tertiary p-0"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <ProjectIconPicker
                    icon={icon}
                    color={color}
                    onPickIcon={setIcon}
                    onPickColor={setColor}
                  />
                </DropdownMenuContent>
              </DropdownMenu>

              <label className="flex w-full flex-col gap-1.5">
                <span className="flex items-center justify-between text-sm font-medium text-secondary">
                  {merged ? "Group Name" : "Project Name"}
                  <span className="font-medium text-quaternary">Optional</span>
                </span>
                <input
                  name="project-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mission Control"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  className={`${FIELD} placeholder:text-tertiary`}
                />
              </label>

              <SelectField label="Working in..." value={workspaces[workspaceId]?.name ?? workspaceId}>
                <DropdownMenuRadioGroup value={workspaceId} onValueChange={setWorkspaceId}>
                  {workspaceOrder.map((id) => (
                    <DropdownMenuRadioItem key={id} value={id}>
                      {workspaces[id]?.name ?? id}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </SelectField>
            </div>

            <div className="h-px w-full bg-[var(--border-quaternary)]" />
            <div className="flex w-full items-center justify-between px-4 py-4">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Model"
                    className="flex h-8 shrink-0 items-center gap-2 rounded-full px-2 text-left text-base text-secondary outline-none transition-colors duration-base hover:bg-tertiary data-[state=open]:bg-tertiary"
                  >
                    <span>{model}</span>
                    <Icon name="chevron-down" size="sm" color="secondary" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  portalled={false}
                  align="start"
                  className="z-[700] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
                >
                  <DropdownMenuSection>
                    <DropdownMenuRadioGroup
                      value={model}
                      onValueChange={(next) => {
                        const match = PROJECT_MODELS.find((item) => item === next);
                        if (match) setModel(match);
                      }}
                    >
                      {PROJECT_MODELS.map((item) => (
                        <DropdownMenuRadioItem key={item} value={item}>
                          {item}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSection>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="submit"
                disabled={!!editingProjectId && !dirty}
                className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-neutral px-3 text-lg font-medium text-inverted hover:bg-neutral-hover disabled:pointer-events-none disabled:opacity-40"
              >
                {editingProjectId ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </motion.div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function SelectField({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className="text-sm font-medium text-secondary">{label}</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className={`${FIELD} text-left`}>
            <span className="min-w-0 flex-1 truncate">{value}</span>
            <Icon name="chevron-down" size="sm" color="secondary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          portalled={false}
          align="start"
          className="z-[700] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuSection>{children}</DropdownMenuSection>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
