import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import {
  useSidebarChromeCollapsed,
  useWindowId,
} from "@/components/window/WindowContext";
import { useAppearanceStore } from "@/store/useAppearanceStore";
import { useUiStore } from "@/store/useUiStore";

const CARD_MOTION = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
};

const NUX_LIGHT = { bg: "#F3F2EF", ink: "#655918", accent: "#E86E2C" };
const NUX_DARK = { bg: "#211C04", ink: "#CCCAC5", accent: "#E25A28" };

const ORBIT_CX = 199;
const ORBIT_CY = 120;
/** Card is 300px; viewBox is 399 wide. Outer diameter ≈ 308px → r 205. */
const ORBIT_RADII = [63, 98.5, 134, 169.5, 205];
/** Polar degrees; each sits on the matching radius. */
const ORBIT_DOTS: { r: number; deg: number }[] = [
  { r: 63, deg: 80 },
  { r: 98.5, deg: -49.1 },
  { r: 134, deg: -150.1 },
  { r: 134, deg: 126.1 },
  { r: 134, deg: 17.3 },
  { r: 169.5, deg: 210 },
  { r: 205, deg: 170.8 },
  { r: 205, deg: -21.5 },
];

function orbitDot(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { cx: ORBIT_CX + r * Math.cos(rad), cy: ORBIT_CY + r * Math.sin(rad) };
}

/** Orbit art from Projects Figma node 2020:2594. */
function ProjectsNuxArt({ palette }: { palette: typeof NUX_LIGHT }) {
  return (
    <svg
      viewBox="0 0 399 240"
      className="size-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <rect width="399" height="240" fill={palette.bg} />
      {ORBIT_RADII.map((r) => (
        <circle
          key={r}
          cx={ORBIT_CX}
          cy={ORBIT_CY}
          r={r}
          fill="none"
          stroke={palette.ink}
          strokeWidth="0.5"
          strokeDasharray="8 4"
          opacity="0.4"
        />
      ))}
      <circle
        cx={ORBIT_CX}
        cy={ORBIT_CY}
        r="16"
        fill="none"
        stroke={palette.accent}
        strokeWidth="1.25"
      />
      {ORBIT_DOTS.map((dot) => {
        const { cx, cy } = orbitDot(dot.r, dot.deg);
        return <circle key={`${dot.r}-${dot.deg}`} cx={cx} cy={cy} r="4" fill={palette.ink} />;
      })}
    </svg>
  );
}

/** Floating intro card above the sidebar account row. Click opens the intro. */
export function ProjectsNux() {
  const windowId = useWindowId();
  const dark = useAppearanceStore((s) => s.theme === "dark");
  const palette = dark ? NUX_DARK : NUX_LIGHT;
  const collapsed = useSidebarChromeCollapsed();
  const dismissed = useUiStore((s) => s.projectsNuxDismissed);
  const dismiss = useUiStore((s) => s.dismissProjectsNux);
  const openIntro = useUiStore((s) => s.openProjectsIntro);
  const visible = !dismissed && !collapsed;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="projects-nux"
          initial={CARD_MOTION.initial}
          animate={CARD_MOTION.animate}
          exit={CARD_MOTION.exit}
          transition={CARD_MOTION.transition}
          className="absolute bottom-3 left-3 z-40 w-[300px]"
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => openIntro(windowId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openIntro(windowId);
              }
            }}
            className="relative flex w-full flex-col overflow-hidden rounded-xl bg-elevated text-left shadow-sm before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit] before:border before:border-secondary before:content-['']"
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismiss();
              }}
              className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-secondary backdrop-blur-[8px] hover:text-primary"
              style={{ background: "color-mix(in oklab, var(--base) 5%, transparent)" }}
            >
              <Icon name="x" size="sm" color="inherit" />
            </button>
            <div className="aspect-video w-full overflow-hidden" style={{ background: palette.bg }}>
              <ProjectsNuxArt palette={palette} />
            </div>
            <div className="flex flex-col gap-1 px-2.5 py-2.5">
              <div className="text-lg font-medium text-primary">Introducing Projects</div>
              <div className="text-base text-secondary">
                You talk to the manager. They talk to your agents.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
