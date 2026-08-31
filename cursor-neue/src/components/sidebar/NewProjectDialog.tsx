import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
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
import { NewProjectSuggestions } from "@/components/sidebar/NewProjectSuggestions";
import { finishPendingMoveToProject } from "@/components/sidebar/sidebarAgentSelection";
import { PROJECT_MODELS } from "@/data/models";
import {
  DEFAULT_WORKSPACE_ID,
  PROJECT_COLOR_STROKE,
  isProject,
  primaryWorkspaceId,
  type ProjectColor,
} from "@/types";
import type { IconName } from "@/icons/iconNames";
import { useWindowId } from "@/components/window/WindowContext";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const FIELD =
  "flex w-full items-center gap-2 rounded-lg border border-secondary bg-quaternary px-2 py-2 text-base text-primary outline-none";

/** Overlay and panel share this timing so they read as one unit. */
const DIALOG_EASE = [0.25, 1, 0.5, 1] as const;

const GHOST_BUTTON =
  "flex h-8 shrink-0 items-center justify-center rounded-lg px-3 text-lg font-medium text-secondary outline-none hover:bg-tertiary hover:text-primary";

/** Create-project dialog. Scrim stays inside the window, same as Customize. */
export function NewProjectDialog() {
  const windowId = useWindowId();
  const open = useUiStore((s) => s.newProjectWindowId === windowId);
  const close = useUiStore((s) => s.closeNewProject);
  const draft = useUiStore((s) => s.newProjectDraft);
  const editingProjectId = useUiStore((s) => s.editingProjectId);
  const pendingMoveAgentIds = useUiStore((s) => s.pendingMoveAgentIds);
  const dismissPlaceholder = useUiStore((s) => s.dismissProjectPlaceholder);
  const createMode = useFeatureFlags((s) => s.projectCreate);
  const advanced = createMode === "advanced";
  const [customForm, setCustomForm] = useState(false);
  const showSuggestions =
    createMode === "suggestions" &&
    !customForm &&
    !draft &&
    !editingProjectId &&
    !pendingMoveAgentIds?.length;
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
    setCustomForm(false);
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
        setCustomForm(true);
        setBaseline(next);
      }
      return;
    }
    setBaseline(null);
    if (draft) {
      setTitle(draft.title);
      setIcon(draft.icon);
      setColor(draft.color);
      setCustomForm(true);
    }
    const pendingId = pendingMoveAgentIds?.[0];
    if (pendingId) {
      const source = useWorkspaceStore.getState().agents[pendingId];
      if (source) setWorkspaceId(primaryWorkspaceId(source));
    }
  }, [draft, editingProjectId, open, pendingMoveAgentIds]);

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
      description: draft?.description,
      agents: draft?.agents,
    });
    if (projectId) finishPendingMoveToProject(windowId, projectId);
    if (draft) dismissPlaceholder(draft.id);
    close();
    reset();
  };

  if (!open) return null;

  const form = (
    <form
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {!advanced && (
        <Dialog.Title className="sr-only">
          {editingProjectId ? "Edit project" : "Create project"}
        </Dialog.Title>
      )}
      <div className="flex flex-col items-center gap-5 px-4 pb-4 pt-6">
        {advanced && (
          <Dialog.Title className="w-full text-3xl font-medium text-primary">
            {editingProjectId ? "Edit Project" : "Create Project"}
          </Dialog.Title>
        )}
        {!advanced && (
          <DropdownMenu modal={false} open={pickerOpen} onOpenChange={setPickerOpen}>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Edit project icon">
                <ProjectBadge color={color} icon={icon} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
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
        )}

        <label className={advanced ? "flex w-full flex-col gap-2" : "flex w-full flex-col gap-1.5"}>
          <span className="flex items-center justify-between text-sm font-medium text-secondary">
            {advanced ? "Name and Icon" : "Project Name"}
            <span className="font-medium text-quaternary">Optional</span>
          </span>
          {advanced ? (
            <span className="flex items-center gap-2">
              <DropdownMenu modal={false} open={pickerOpen} onOpenChange={setPickerOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Edit project icon"
                    className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-secondary bg-quaternary [--badge-angle:0deg] dark:[--badge-angle:180deg]"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={iconWellWash(color)}
                    />
                    <span className="relative flex size-full items-center justify-center">
                      <Icon
                        name={icon}
                        size="lg"
                        color="inherit"
                        style={{ color: PROJECT_COLOR_STROKE[color] }}
                      />
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
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
              <input
                name="project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mission Control"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                className={`${FIELD} min-w-0 flex-1 placeholder:text-tertiary`}
              />
            </span>
          ) : (
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
          )}
        </label>

        <SelectField
          label="Working in..."
          value={workspaces[workspaceId]?.name ?? workspaceId}
          labelGap={advanced ? "gap-2" : "gap-1.5"}
        >
          <DropdownMenuRadioGroup value={workspaceId} onValueChange={setWorkspaceId}>
            {workspaceOrder.map((id) => (
              <DropdownMenuRadioItem key={id} value={id}>
                {workspaces[id]?.name ?? id}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </SelectField>

        {advanced && (
          <SelectField label="Model" value={model} labelGap="gap-2">
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
          </SelectField>
        )}
      </div>

      {advanced && (
        <>
          <div className="h-px w-full bg-[var(--border-quaternary)]" />
          <div className="flex w-full items-center justify-between px-4 py-4">
            <Dialog.Close asChild>
              <button type="button" className={GHOST_BUTTON}>
                Cancel
              </button>
            </Dialog.Close>
            <CreateButton
              label={editingProjectId ? "Save" : "Create"}
              disabled={!!editingProjectId && !dirty}
            />
          </div>
        </>
      )}

      {!advanced && (
        <>
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
            <CreateButton
              label={editingProjectId ? "Save" : "Create"}
              disabled={!!editingProjectId && !dirty}
            />
          </div>
        </>
      )}
    </form>
  );

  const card = (
    <motion.div
      initial={{ opacity: 0, scale: 0.995 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={dialogTransition}
      className={
        showSuggestions
          ? "max-h-[min(680px,88%)] overflow-y-auto overflow-x-hidden rounded-[20px] bg-elevated shadow-window will-change-transform"
          : advanced
            ? "max-h-[min(680px,88%)] w-[456px] overflow-y-auto overflow-x-hidden rounded-[20px] bg-elevated shadow-window will-change-transform"
            : "w-[340px] rounded-[20px] bg-elevated shadow-window will-change-transform"
      }
    >
      {showSuggestions ? (
        <NewProjectSuggestions
          onCustom={() => setCustomForm(true)}
          onAdd={(templates) => {
            for (const template of templates) {
              createProject(windowId, {
                title: template.title,
                workspaceId,
                icon: template.icon,
                color: template.color,
                description: template.description,
                agents: template.agents,
              });
            }
            close();
            reset();
          }}
        />
      ) : (
        form
      )}
    </motion.div>
  );

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
        {card}
      </Dialog.Content>
    </Dialog.Root>
  );
}

function CreateButton({
  label = "Create",
  disabled = false,
}: {
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-neutral px-3 text-lg font-medium text-inverted hover:bg-neutral-hover disabled:pointer-events-none disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function iconWellWash(color: ProjectColor): CSSProperties {
  const key = PROJECT_COLOR_STROKE[color];
  const fillFrom = `color-mix(in oklab, ${key} 18%, transparent)`;
  const fillTo = `color-mix(in oklab, ${key} 8%, transparent)`;
  return {
    backgroundImage: `linear-gradient(var(--badge-angle), ${fillFrom}, ${fillTo})`,
  };
}

function SelectField({
  label,
  value,
  children,
  labelGap = "gap-1.5",
}: {
  label: string;
  value: string;
  children: ReactNode;
  labelGap?: "gap-1.5" | "gap-2";
}) {
  return (
    <div className={`flex w-full flex-col ${labelGap}`}>
      <span className="text-sm font-medium text-secondary">{label}</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className={`${FIELD} text-left`}>
            <span className="min-w-0 flex-1 truncate">{value}</span>
            <Icon name="chevron-down" size="sm" color="secondary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="z-[700] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuSection>{children}</DropdownMenuSection>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
