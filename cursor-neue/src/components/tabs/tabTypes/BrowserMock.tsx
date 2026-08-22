import { TrafficLights } from "@/components/sidebar/SidebarControls";

// Page gutter + content measure from the mock: an even 64px frame around a
// centered 708px column.
const PAGE_PADDING = "p-16";
const CONTENT_MAX_WIDTH = "max-w-[708px]";

// The card holds a 5:4 ratio off its width, but at narrow widths that height
// gets too short — floor it (and let it overflow the fold instead).
const CARD_MIN_HEIGHT = "min-h-[400px]";

export interface BrowserMockProps {
  title: string;
  subtitle: string;
  /** Top stop of the hero → chrome wash. A token (e.g. var(--bg-brand)) so the
   *  fade follows the active theme; the bottom always resolves to chrome. */
  gradientTop: string;
}

// Everysphere and Baby Glass share this exact layout; only the copy + hero
// wash differ.
export const EVERYSPHERE: BrowserMockProps = {
  title: "Everysphere",
  subtitle: "Touch the future.",
  gradientTop: "var(--bg-neutral)",
};
export const BABY_GLASS: BrowserMockProps = {
  title: "Baby Glass",
  subtitle: "Wake up and build something.",
  gradientTop: "var(--bg-accent)",
};
// The "ettore/new-landing-page" branch of everysphere: same layout, but the
// hero wash starts from the primary surface instead of the brand color.
export const EVERYSPHERE_REDESIGN: BrowserMockProps = {
  title: "Everysphere",
  subtitle: "A matter of taste.",
  gradientTop: "var(--bg-brand)",
};

/** Static landing page rendered inside an empty Browser tab. Sells the idea
 *  that the user is viewing/editing a web page: a brand hero (copy + CTA)
 *  above a window-framed screenshot card (traffic-light toolbar + body). */
export function BrowserMock({ title, subtitle, gradientTop }: BrowserMockProps) {
  return (
    <div
      className={`flex h-full w-full justify-center overflow-hidden ${PAGE_PADDING}`}
      style={{ background: `linear-gradient(180deg, ${gradientTop} 0%, var(--bg-chrome) 100%)` }}
    >
      <div className={`flex w-full flex-col gap-8 ${CONTENT_MAX_WIDTH}`}>
        <header className="flex flex-col items-start gap-5">
          <div className="flex flex-col gap-0.5">
            <p className="text-xl text-luminous">{title}</p>
            <p className="text-xl text-luminous-secondary">{subtitle}</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-luminous-secondary px-4 py-1 text-base font-medium text-luminous transition-opacity hover:opacity-90"
          >
            Get
          </button>
        </header>

        <div
          className={`flex aspect-[5/4] w-full shrink-0 flex-col overflow-hidden rounded-xl bg-editor shadow-xl ${CARD_MIN_HEIGHT}`}
        >
          <div className="flex h-toolbar shrink-0 items-center px-3 shadow-[inset_0_-1px_0_0_var(--border-tertiary)]">
            <TrafficLights />
          </div>
          <div className="min-h-0 flex-1 bg-editor" />
        </div>
      </div>
    </div>
  );
}
