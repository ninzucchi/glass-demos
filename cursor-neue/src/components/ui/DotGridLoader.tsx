import clsx from "clsx";
import "./dot-grid-loader.scss";

const DIMENSION = 3;
const STEP = 4;
const RADIUS = 1.125;
const CENTER_OFFSET = 1.25;
const VIEWBOX = CENTER_OFFSET * 2 + STEP * (DIMENSION - 1);
const DOT_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Default matches everysphere `DotGridLoader` `xs` (Kanban working glyph). */
const DEFAULT_SIZE_PX = 10;

export function DotGridLoader({
  size = DEFAULT_SIZE_PX,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={clsx("dot-grid-loader", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        className="dot-grid-loader__grid"
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        role="presentation"
        focusable="false"
        aria-hidden
      >
        {DOT_INDICES.map((dotIndex) => {
          const row = Math.floor((dotIndex - 1) / DIMENSION);
          const column = (dotIndex - 1) % DIMENSION;
          return (
            <circle
              key={dotIndex}
              className={`dot-grid-loader__dot dot-grid-loader__dot--${dotIndex}`}
              cx={CENTER_OFFSET + column * STEP}
              cy={CENTER_OFFSET + row * STEP}
              r={RADIUS}
            />
          );
        })}
      </svg>
    </span>
  );
}
