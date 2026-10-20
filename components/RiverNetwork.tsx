import { useEffect, useId, useState } from "react";

type RiverData = {
  year: number;
  width: number;
  height: number;
  origin: [number, number];
  border: string;
  bands: Record<"none" | "low" | "mid" | "high", string>;
  farms: Record<"sparse" | "low" | "mid" | "high", string>;
};

// Matches the baked file, so the box holds its size before the paths arrive
// and the hero does not jump when they do.
const ASPECT = "1000 / 813";

// drawn back to front: unmonitored reaches are the faint skeleton underneath
const BANDS = [
  { name: "none", stroke: "rgb(var(--color-muted))", opacity: 0.45, width: 0.7 },
  { name: "low", stroke: "var(--river-low)", opacity: 0.9, width: 0.9 },
  { name: "mid", stroke: "var(--river-mid)", opacity: 0.95, width: 1 },
  { name: "high", stroke: "var(--river-high)", opacity: 1, width: 1.15 },
] as const;

// Cattle per hectare by farm ward, under the rivers. Colours are per theme in
// src/index.css: the live map's ramp in light mode, the same greens run dark to
// bright in dark mode.
export const FARM_BANDS = [
  { name: "sparse", label: "< 0.5", colour: "var(--farm-sparse)" },
  { name: "low", label: "0.5–1.5", colour: "var(--farm-low)" },
  { name: "mid", label: "1.5–2.5", colour: "var(--farm-mid)" },
  { name: "high", label: "> 2.5", colour: "var(--farm-high)" },
] as const;

export function RiverNetwork({ className }: { className?: string }) {
  const [data, setData] = useState<RiverData | null>(null);
  // useId's colons are not valid inside url(#...)
  const id = useId().replace(/:/g, "");
  const maskId = `rivers-${id}`;
  const clipId = `land-${id}`;

  useEffect(() => {
    let cancelled = false;
    fetch("/hero/rivers.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((json: RiverData | null) => {
        if (!cancelled && json) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // from Lough Neagh to the farthest corner, so the reveal ends as it covers the last river
  const radius = data
    ? Math.hypot(Math.max(data.origin[0], data.width - data.origin[0]), Math.max(data.origin[1], data.height - data.origin[1]))
    : 0;

  return (
    <div className={className} style={{ aspectRatio: ASPECT }}>
      {data && (
        <svg
          viewBox={`0 0 ${data.width} ${data.height}`}
          className="h-full w-full"
          role="img"
          aria-label={`Northern Ireland's rivers coloured by soluble phosphorus level, ${data.year}`}
        >
          {/* the coast, the border and the large loughs' shores; there from the start, framing the reveal */}
          <path
            d={data.border}
            fill="none"
            stroke="rgb(var(--color-muted))"
            strokeOpacity={0.55}
            strokeWidth={0.8}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* The network spreads out from Lough Neagh, which is where it all drains to. */}
          <mask id={maskId}>
            <circle className="river-reveal" cx={data.origin[0]} cy={data.origin[1]} r={radius} fill="white" />
          </mask>
          {/* ward edges are generalised differently from OSNI's coast, so the farms are trimmed to it */}
          <clipPath id={clipId}>
            <path d={data.border} clipRule="evenodd" />
          </clipPath>
          <g mask={`url(#${maskId})`}>
            <g clipPath={`url(#${clipId})`}>
              {FARM_BANDS.map((band) => (
                <path key={band.name} d={data.farms[band.name]} fill={band.colour} />
              ))}
            </g>
          </g>
          <g mask={`url(#${maskId})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {BANDS.map((band) => (
              <path
                key={band.name}
                d={data.bands[band.name]}
                stroke={band.stroke}
                strokeOpacity={band.opacity}
                strokeWidth={band.width}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
