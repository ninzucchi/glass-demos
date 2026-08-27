import { useState, type CSSProperties, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "motion/react";
import { ProjectBadge } from "@/components/chat/ProjectBadge";
import { ProjectIconPicker } from "@/components/sidebar/ProjectIconPicker";
import { SidebarCollapse } from "@/components/sidebar/SidebarCollapse";
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
import {
  PROJECT_SUGGESTIONS,
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/data/projectTemplates";
import { DEFAULT_WORKSPACE_ID, PROJECT_COLOR_STROKE, type ProjectColor } from "@/types";
import type { IconName } from "@/icons/iconNames";
import { useWindowId } from "@/components/window/WindowContext";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const PROJECT_MODELS = [
  "Grok 4.6 High Fast",
  "Claude 4.6 Opus",
  "GPT-5.4",
  "Composer 2",
  "Gemini 3 Pro",
] as const;

const FIELD =
  "flex w-full items-center gap-2 rounded-lg border border-secondary bg-quaternary px-2 py-2 text-base text-primary outline-none";

const WELL_TONE: Record<ProjectColor, string> = {
  default: "bg-quaternary border-secondary",
  green: "bg-green-quaternary border-green-quaternary",
  cyan: "bg-cyan-quaternary border-cyan-quaternary",
  blue: "bg-blue-quaternary border-blue-quaternary",
  purple: "bg-purple-quaternary border-purple-quaternary",
  magenta: "bg-magenta-quaternary border-magenta-quaternary",
  orange: "bg-orange-quaternary border-orange-quaternary",
  yellow: "bg-yellow-quaternary border-yellow-quaternary",
  red: "bg-red-quaternary border-red-quaternary",
  brand: "bg-[color-mix(in_oklab,var(--brand)_8%,transparent)] border-[color-mix(in_oklab,var(--brand)_28%,transparent)]",
};

/** Overlay and panel share this timing so they read as one unit. */
const DIALOG_EASE = [0.25, 1, 0.5, 1] as const;

/** Create-project dialog. Scrim stays inside the window, same as Customize. */
export function NewProjectDialog() {
  const windowId = useWindowId();
  const open = useUiStore((s) => s.newProjectWindowId === windowId);
  const close = useUiStore((s) => s.closeNewProject);
  const createMode = useFeatureFlags((s) => s.projectCreate);
  const rich = createMode === "rich";
  const [customForm, setCustomForm] = useState(false);
  const showSuggestions = createMode === "suggestions" && !customForm;
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const workspaceOrder = useWorkspaceStore((s) => s.workspaceOrder);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<IconName>("pencil");
  const [color, setColor] = useState<ProjectColor>("blue");
  const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
  const [model, setModel] = useState<(typeof PROJECT_MODELS)[number]>(PROJECT_MODELS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const reduceMotion = useReducedMotion();
  const dialogTransition = {
    duration: reduceMotion ? 0 : 0.2,
    ease: DIALOG_EASE,
  };

  const reset = () => {
    setTitle("");
    setIcon("pencil");
    setColor("blue");
    setWorkspaceId(DEFAULT_WORKSPACE_ID);
    setModel(PROJECT_MODELS[0]);
    setPickerOpen(false);
    setTemplatesOpen(true);
    setCustomForm(false);
  };

  const submit = (template?: ProjectTemplate) => {
    createProject(windowId, {
      title: template?.title ?? title,
      workspaceId,
      icon: template?.icon ?? icon,
      color: template?.color ?? color,
      description: template?.description,
      agents: template?.agents,
    });
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
          className={
            showSuggestions
              ? "max-h-[min(680px,88%)] overflow-y-auto overflow-x-hidden rounded-[20px] bg-elevated shadow-window will-change-transform"
              : rich
                ? "max-h-[min(680px,88%)] w-[520px] overflow-y-auto overflow-x-hidden rounded-[20px] bg-elevated shadow-window will-change-transform"
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
        <>
        <Dialog.Title className="sr-only">Create project</Dialog.Title>
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col items-center gap-5 px-4 pb-4 pt-6">
          {!rich && (
            <DropdownMenu modal={false} open={pickerOpen} onOpenChange={setPickerOpen}>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Edit project icon" className="relative">
                  <ProjectBadge color={color} icon={icon} />
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full bg-luminous shadow-sm">
                    <Icon
                      name="arrow-cw"
                      size="sm"
                      color="inherit"
                      style={{ color: "var(--base)" }}
                    />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                side="bottom"
                className="z-[700] !min-w-0 p-0"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <ProjectIconPicker
                  icon={icon}
                  color={color}
                  onPickIcon={setIcon}
                  onPickColor={setColor}
                  onBack={() => setPickerOpen(false)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <label className="flex w-full flex-col gap-1.5">
            <span className="flex items-center justify-between text-sm font-medium text-secondary">
              Name
              <span className="font-medium text-quaternary">Optional</span>
            </span>
            {rich ? (
              <span className="flex items-center gap-2">
                <DropdownMenu modal={false} open={pickerOpen} onOpenChange={setPickerOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Edit project icon"
                      className="size-9 shrink-0 rounded-lg border border-secondary [--badge-angle:0deg] dark:[--badge-angle:180deg]"
                      style={iconWellFill(color)}
                    >
                      <span className="flex size-full items-center justify-center">
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
                    className="z-[700] !min-w-0 p-0"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <ProjectIconPicker
                      icon={icon}
                      color={color}
                      onPickIcon={setIcon}
                      onPickColor={setColor}
                      onBack={() => setPickerOpen(false)}
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
          >
            <DropdownMenuRadioGroup value={workspaceId} onValueChange={setWorkspaceId}>
              {workspaceOrder.map((id) => (
                <DropdownMenuRadioItem key={id} value={id}>
                  {workspaces[id]?.name ?? id}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </SelectField>

          {rich && (
            <SelectField label="Model" value={model}>
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

          {rich && (
            <div className="flex w-full justify-end">
              <CreateButton />
            </div>
          )}
          </div>

          {rich ? (
            <>
              <TemplatesDivider
                open={templatesOpen}
                onToggle={() => setTemplatesOpen((next) => !next)}
              />
              <SidebarCollapse open={templatesOpen} padded={false}>
                <div className="overflow-x-auto px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max gap-1.5">
                    {[...PROJECT_SUGGESTIONS, ...PROJECT_TEMPLATES].map((item) => (
                      <TemplateCard
                        key={item.id}
                        item={item}
                        onPick={() => submit(item)}
                      />
                    ))}
                  </div>
                </div>
              </SidebarCollapse>
            </>
          ) : (
            <div className="h-px w-full bg-[var(--border-quaternary)]" />
          )}

          {!rich && (
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
              <CreateButton />
            </div>
          )}
        </form>
        </>
        )}
        </motion.div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function CreateButton() {
  return (
    <button
      type="submit"
      className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-neutral px-3 text-lg font-medium text-inverted hover:bg-neutral-hover"
    >
      Create
    </button>
  );
}

function iconWellFill(color: ProjectColor): CSSProperties {
  const key = PROJECT_COLOR_STROKE[color];
  const fillFrom = `color-mix(in oklab, ${key} 18%, var(--bg-chrome))`;
  const fillTo = `color-mix(in oklab, ${key} 8%, var(--bg-chrome))`;
  return {
    backgroundImage: `linear-gradient(var(--badge-angle), ${fillFrom}, ${fillTo})`,
  };
}

function TemplatesDivider({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="h-px min-w-0 flex-1 bg-[var(--border-quaternary)]" />
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex shrink-0 items-center gap-1 text-base text-secondary outline-none hover:text-primary"
      >
        Templates
        <Icon name={open ? "chevron-up" : "chevron-down"} size="sm" color="inherit" />
      </button>
      <span className="h-px min-w-0 flex-1 bg-[var(--border-quaternary)]" />
    </div>
  );
}

function TemplateCard({
  item,
  onPick,
}: {
  item: ProjectTemplate;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex h-[82px] w-[240px] shrink-0 items-start gap-2.5 overflow-hidden rounded-xl border border-secondary bg-quaternary p-2.5 text-left hover:bg-tertiary"
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border ${WELL_TONE[item.color]}`}
      >
        <Icon
          name={item.icon}
          color="inherit"
          style={{
            width: 24,
            height: 24,
            fontSize: 24,
            color: PROJECT_COLOR_STROKE[item.color],
          }}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-medium text-primary">{item.title}</span>
        <span className="line-clamp-2 text-base text-secondary">{item.description}</span>
      </span>
    </button>
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
          align="start"
          className="z-[700] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuSection>{children}</DropdownMenuSection>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
