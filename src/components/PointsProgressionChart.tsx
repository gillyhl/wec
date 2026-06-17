"use client";

import { useState } from "react";

export interface ProgressionSeries {
  id: string;
  label: string;
  color: string;
  // Cumulative points after each race, aligned to `raceLabels`.
  cumulative: number[];
}

interface Props {
  raceLabels: string[];
  series: ProgressionSeries[];
}

// SVG view-box dimensions. The chart scales responsively to its container
// while keeping these internal coordinates.
const WIDTH = 720;
const HEIGHT = 360;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

// "Nice" upper bound and tick step for the y-axis given a max value.
function niceAxis(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 10, step: 5 };
  const rough = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  return { top: Math.ceil(max / step) * step, step };
}

export default function PointsProgressionChart({ raceLabels, series }: Props) {
  // Highlighted via the legend.
  const [active, setActive] = useState<string | null>(null);
  // Data point under the cursor, shown as a tooltip.
  const [hover, setHover] = useState<{ id: string; index: number } | null>(
    null,
  );

  // X positions: an origin point at 0 points, then one per race.
  const pointCount = raceLabels.length + 1;
  const xAt = (i: number) =>
    PAD_LEFT + (pointCount === 1 ? 0 : (PLOT_W * i) / (pointCount - 1));

  const maxPoints = Math.max(
    1,
    ...series.map((s) => s.cumulative[s.cumulative.length - 1] ?? 0),
  );
  const { top, step } = niceAxis(maxPoints);
  const yAt = (v: number) => PAD_TOP + PLOT_H - (PLOT_H * v) / top;

  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  const linePath = (cumulative: number[]) =>
    [0, ...cumulative]
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
      .join(" ");

  // The hovered point drives both the highlighted line and the tooltip.
  const activeId = hover?.id ?? active;
  const hovered = hover
    ? series.find((s) => s.id === hover.id) ?? null
    : null;
  const hoveredValue = hovered ? hovered.cumulative[hover!.index] ?? 0 : 0;

  return (
    <div>
      <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full"
        role="img"
        aria-label="Points progression per race"
      >
        {/* Horizontal gridlines + y-axis labels */}
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yAt(v)}
              y2={yAt(v)}
              stroke="#333"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 6}
              y={yAt(v)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-neutral-500"
              fontSize={11}
            >
              {v}
            </text>
          </g>
        ))}

        {/* X-axis race labels (skip the origin point) */}
        {raceLabels.map((label, i) => (
          <text
            key={i}
            x={xAt(i + 1)}
            y={HEIGHT - PAD_BOTTOM + 16}
            textAnchor="middle"
            className="fill-neutral-500"
            fontSize={11}
          >
            {label}
          </text>
        ))}

        {/* Racer lines */}
        {series.map((s) => {
          const dimmed = activeId !== null && activeId !== s.id;
          return (
            <path
              key={s.id}
              d={linePath(s.cumulative)}
              fill="none"
              stroke={s.color}
              strokeWidth={activeId === s.id ? 3 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={dimmed ? 0.15 : 1}
              style={{ transition: "opacity 120ms" }}
            />
          );
        })}

        {/* Data points + hover hit areas */}
        {series.map((s) => {
          const dimmed = activeId !== null && activeId !== s.id;
          return (
            <g key={s.id} opacity={dimmed ? 0.15 : 1}>
              {s.cumulative.map((v, j) => {
                const isHover = hover?.id === s.id && hover.index === j;
                return (
                  <g key={j}>
                    <circle
                      cx={xAt(j + 1)}
                      cy={yAt(v)}
                      r={isHover ? 4 : 2.5}
                      fill={s.color}
                    />
                    {/* Larger transparent target makes points easy to hover. */}
                    <circle
                      cx={xAt(j + 1)}
                      cy={yAt(v)}
                      r={10}
                      fill="transparent"
                      onMouseEnter={() => setHover({ id: s.id, index: j })}
                      onMouseLeave={() => setHover(null)}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Tooltip for the hovered data point. */}
      {hovered && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs shadow-lg"
          style={{
            left: `${(xAt(hover.index + 1) / WIDTH) * 100}%`,
            top: `${(yAt(hoveredValue) / HEIGHT) * 100}%`,
            marginTop: -8,
          }}
        >
          <span className="font-medium text-white">{hovered.label}</span>
          <span className="ml-1.5 text-neutral-400">
            {raceLabels[hover.index]}
          </span>
          <span
            className="ml-1.5 font-semibold"
            style={{ color: hovered.color }}
          >
            {hoveredValue} pts
          </span>
        </div>
      )}
      </div>

      {/* Legend doubles as a hover control to highlight a single racer. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <button
            key={s.id}
            type="button"
            onMouseEnter={() => setActive(s.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(s.id)}
            onBlur={() => setActive(null)}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
