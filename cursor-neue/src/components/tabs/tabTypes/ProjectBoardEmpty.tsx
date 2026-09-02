import { OutlineButton } from "@/components/ui/OutlineButton";
import { blankProjectTitle } from "@/lib/mergedLabels";

/** Stacked isometric cards from Figma Projects / empty (2162:5745). */
function ProjectBoardEmptyArt() {
  return (
    <svg
      width={111}
      height={52}
      viewBox="0 0 111.5 52.5"
      fill="none"
      aria-hidden
      className="shrink-0 text-secondary"
    >
      <path
        d="M0.25 14.25L55.75 0.249999L111.25 14.25L55.75 28.25L0.25 14.25Z"
        stroke="currentColor"
        strokeOpacity={0.74}
        strokeWidth={0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0.25 26.25L55.75 12.25L111.25 26.25L55.75 40.25L0.25 26.25Z"
        opacity={0.7}
        stroke="currentColor"
        strokeOpacity={0.56}
        strokeWidth={0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0.25 38.25L55.75 24.25L111.25 38.25L55.75 52.25L0.25 38.25Z"
        opacity={0.5}
        stroke="currentColor"
        strokeOpacity={0.36}
        strokeWidth={0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Right-panel empty state when the project has no tasks. */
export function ProjectBoardEmpty({ title }: { title?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-start gap-5 px-3 pb-6">
      <ProjectBoardEmptyArt />
      <div className="flex w-full max-w-[320px] flex-col gap-2">
        <p className="truncate text-base font-medium text-primary">
          {title?.trim() || blankProjectTitle()}
        </p>
        <div className="flex flex-col gap-2 text-base text-secondary">
          <p>
            Give your project a goal, and it will create a fleet of agents to complete it in
            pieces.
          </p>
          <p>Tasks, agents, and pull requests will appear here as the project proceeds.</p>
        </div>
      </div>
      <OutlineButton>Learn More</OutlineButton>
    </div>
  );
}
