import { Icon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSection,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { TILE_BTN } from "@/components/desktop/dockTile";
import {
  CENTER_SHOT_H,
  CENTER_SHOT_W,
  centerOnDesktop,
  centeredWindowGeo,
  type Geo,
} from "@/components/desktop/geometry";
import { captureElement } from "@/lib/screenshot";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

/** Wait until `done()` holds (a geo snap has reached the DOM), giving up after
 *  a few frames so a capture never hangs on an unreachable target. */
async function settle(done: () => boolean, frames = 12): Promise<void> {
  for (let i = 0; i < frames && !done(); i++) await nextFrame();
  await nextFrame(); // let the committed layout paint
}

function frontmostWindowFrame(): HTMLElement | null {
  const frames = document.querySelectorAll<HTMLElement>("[data-window-frame]");
  return frames[frames.length - 1] ?? null;
}

function desktopEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-desktop]");
}

/** Snap the front-most window to the centered default size, returning the
 *  geometry the DOM is expected to settle on. */
function snapFrontmostCentered(): Geo | null {
  const { windowOrder, setWindowGeo } = useWorkspaceStore.getState();
  const id = windowOrder[windowOrder.length - 1];
  const geo = centeredWindowGeo();
  if (id && geo) setWindowGeo(id, geo);
  return geo;
}

/** The dock's camera tile: opens a menu to download a PNG of the front-most
 *  window, a centered MacBook-sized crop, or the entire desktop. Selectors
 *  point at DOM contracts owned by Desktop/WindowFrame; the capture helper
 *  itself stays target-agnostic. */
export function ScreenshotMenu() {
  const hasWindow = useWorkspaceStore((s) => s.windowOrder.length > 0);

  const runCapture = (fn: () => void | Promise<void>) => {
    void Promise.resolve()
      .then(fn)
      .catch((err) => console.error("Screenshot failed:", err));
  };

  const captureWindow = () => {
    const node = frontmostWindowFrame();
    if (!node) return;
    return captureElement(node, { filename: "cursor-window.png" });
  };

  const captureAll = () => {
    const node = desktopEl();
    if (!node) return;
    return captureElement(node, { filename: "cursor-screen.png", backdrop: true });
  };

  // Renders the desktop at a fixed 1512×982 rather than cropping the real
  // viewport, so the shot is identical on any screen size: the wallpaper and
  // dock re-lay out to fill the frame and the front window is re-centered
  // within it (its own size is untouched, so nothing inside reflows).
  const captureCenter = async () => {
    const snapped = snapFrontmostCentered();
    await settle(() => {
      const box = frontmostWindowFrame()?.getBoundingClientRect();
      return !snapped || !box || Math.round(box.width) === Math.round(snapped.w);
    });
    const node = desktopEl();
    const live = frontmostWindowFrame();
    if (!node || !live) return;
    const { width, height } = live.getBoundingClientRect();
    const { x, y } = centerOnDesktop(CENTER_SHOT_W, CENTER_SHOT_H, width, height);
    await captureElement(node, {
      filename: "cursor-center.png",
      size: { w: CENTER_SHOT_W, h: CENTER_SHOT_H },
      backdrop: true,
      prepare: (clone) => {
        const frames = clone.querySelectorAll<HTMLElement>("[data-window-frame]");
        const front = frames[frames.length - 1];
        if (front) {
          front.style.left = `${x}px`;
          front.style.top = `${y}px`;
        }
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Screenshot"
          className={`${TILE_BTN} bg-luminous-secondary data-[state=open]:translate-x-0 data-[state=open]:hover:translate-x-0`}
        >
          <Icon name="camera" size="lg" color="luminous" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="right">
        <DropdownMenuSection>
          <DropdownMenuItem
            onSelect={() => runCapture(captureWindow)}
            disabled={!hasWindow}
          >
            <Icon name="window" size="base" color="tertiary" />
            Window
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => runCapture(captureCenter)}
            disabled={!hasWindow}
          >
            <Icon name="focus-window" size="base" color="tertiary" />
            Center
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => runCapture(captureAll)}>
            <Icon name="display" size="base" color="tertiary" />
            All
          </DropdownMenuItem>
        </DropdownMenuSection>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
