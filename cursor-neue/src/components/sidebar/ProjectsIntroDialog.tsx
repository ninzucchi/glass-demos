import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/icons/iconNames";
import { useWindowId } from "@/components/window/WindowContext";
import { useFeatureFlags } from "@/store/useFeatureFlags";
import { useUiStore } from "@/store/useUiStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const DIALOG_EASE = [0.25, 1, 0.5, 1] as const;

const ROWS: { icon: IconName; text: string }[] = [
  { icon: "bullseye", text: "Give your Projects large or ambitious goals" },
  { icon: "agents", text: "Projects run agents in parallel to get it done" },
  { icon: "brain", text: "Shared memory and tasks keep agents coordinated" },
];

/** Centered intro to Projects. Same motion and window-clipped scrim as create. */
export function ProjectsIntroDialog() {
  const windowId = useWindowId();
  const open = useUiStore((s) => s.projectsIntroWindowId === windowId);
  const close = useUiStore((s) => s.closeProjectsIntro);
  const dismissNux = useUiStore((s) => s.dismissProjectsNux);
  const openNewProject = useUiStore((s) => s.openNewProject);
  const createDraftProject = useWorkspaceStore((s) => s.createDraftProject);
  const createMode = useFeatureFlags((s) => s.projectCreate);
  const reduceMotion = useReducedMotion();
  const dialogTransition = {
    duration: reduceMotion ? 0 : 0.2,
    ease: DIALOG_EASE,
  };

  const start = () => {
    close();
    dismissNux();
    if (createMode === "composer") createDraftProject(windowId);
    else openNewProject(windowId);
  };

  if (!open) return null;

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) close();
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
        className="absolute left-1/2 top-1/2 z-modal -translate-x-1/2 -translate-y-1/2 outline-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.995 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={dialogTransition}
          className="flex w-[432px] flex-col gap-5 rounded-[20px] bg-elevated p-5 shadow-window will-change-transform"
        >
          <div className="flex flex-col gap-1.5">
            <Dialog.Title className="text-3xl font-medium text-primary">
              Introducing Projects
            </Dialog.Title>
            <Dialog.Description className="text-base text-secondary">
              Projects help you take on large units of work, without getting lost in the weeds.
            </Dialog.Description>
          </div>
          <ul className="flex flex-col gap-3">
            {ROWS.map((row) => (
              <li key={row.text} className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-secondary">
                  <Icon name={row.icon} size="base" color="secondary" />
                </span>
                <span className="text-base text-secondary">{row.text}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={start}
            className="flex h-8 w-full items-center justify-center rounded-lg bg-neutral text-lg font-medium text-inverted hover:bg-neutral-hover"
          >
            Get Started
          </button>
        </motion.div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
