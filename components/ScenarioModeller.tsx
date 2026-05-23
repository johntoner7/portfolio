import { useState } from "react";
import { ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";

import {
  AGRICULTURE_PROJECTION,
  AGRI_GAP,
  AGRI_TARGET_2030,
  NAEI_AGRI_2023,
  ENTERIC_KT,
  DAIRY_ENTERIC_KT,
  NON_DAIRY_ENTERIC_KT,
  SLURRY_METHANE_KT,
  SOIL_FERTILISER_KT,
  BOVAER_EFFICACY,
  PEATLAND_RATE,
  TOTAL_CATTLE,
  GENETICS_REDUCTION_KT,
  AD_POTENTIAL_KT,
  COMMITTED_BASELINE_KT,
} from "@/lib/niClimateData";

const ADJUSTED_GAP = AGRI_GAP - COMMITTED_BASELINE_KT;
const GAP_CLOSING_HERD_PCT = Math.ceil((ADJUSTED_GAP / ENTERIC_KT) * 100);
const MAX_ENTERIC_KT = Math.round(
  0.9 * DAIRY_ENTERIC_KT * BOVAER_EFFICACY +
  0.9 * NON_DAIRY_ENTERIC_KT * BOVAER_EFFICACY +
  0.5 * ENTERIC_KT +
  GENETICS_REDUCTION_KT,
);
const MAX_SLURRY_SOILS_KT = Math.round(0.8 * SLURRY_METHANE_KT * 0.4 + SOIL_FERTILISER_KT);
const MAX_LAND_USE_KT = Math.round((10000 * PEATLAND_RATE) / 1000);

function pctOfGap(kt: number) {
  return Math.round((kt / AGRI_GAP) * 100);
}

function sliderBg(value: number, max: number) {
  const pct = (value / max) * 100;
  return `linear-gradient(to right, rgb(37,99,235) 0%, rgb(37,99,235) ${pct}%, rgb(var(--color-divider)) ${pct}%, rgb(var(--color-divider)) 100%)`;
}

function sliderBgMuted(value: number, max: number) {
  const pct = (value / max) * 100;
  return `linear-gradient(to right, rgb(100,116,139) 0%, rgb(100,116,139) ${pct}%, rgb(var(--color-divider)) ${pct}%, rgb(var(--color-divider)) 100%)`;
}

function RightEdgeReferenceLabel({
  viewBox,
  value,
  fill,
  dy = 0,
}: {
  viewBox?: { x?: number; y?: number };
  value: string;
  fill: string;
  dy?: number;
}) {
  if (typeof viewBox?.x !== "number" || typeof viewBox?.y !== "number") return null;
  return (
    <text x={viewBox.x + 8} y={viewBox.y + dy} fill={fill} fontSize={9} textAnchor="start" dominantBaseline="middle">
      {value}
    </text>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const year = Number(label);
  const key = year < 2024 ? "actual" : "scenario";
  const item = payload.find((p) => p.value != null && p.dataKey === key);
  if (!item) return null;
  return (
    <div className="rounded bg-surface/90 px-2 py-1 text-[10px] shadow backdrop-blur-sm">
      <p className="text-muted">
        {year}: {Math.round(item.value).toLocaleString()} kt
      </p>
    </div>
  );
}

export function ScenarioModeller() {
  const [bovaerPct, setBovaerPct] = useState(0);
  const [nonDairyPct, setNonDairyPct] = useState(0);
  const [slurryPct, setSlurryPct] = useState(0);
  const [fertPct, setFertPct] = useState(0);
  const [peatlandHa, setPeatlandHa] = useState(0);
  const [herdPct, setHerdPct] = useState(0);
  const [geneticsOn, setGeneticsOn] = useState(false);
  const [adOn, setAdOn] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const bovaerReduction = Math.min((bovaerPct / 100) * DAIRY_ENTERIC_KT * BOVAER_EFFICACY, DAIRY_ENTERIC_KT);
  const nonDairyReduction = Math.min((nonDairyPct / 100) * NON_DAIRY_ENTERIC_KT * BOVAER_EFFICACY, NON_DAIRY_ENTERIC_KT);
  const slurryReduction = Math.min((slurryPct / 100) * SLURRY_METHANE_KT * 0.4, SLURRY_METHANE_KT);
  const fertReduction = Math.min((fertPct / 100) * SOIL_FERTILISER_KT, SOIL_FERTILISER_KT);
  const peatlandReduction = (peatlandHa * PEATLAND_RATE) / 1000;
  const herdReduction = Math.min((herdPct / 100) * ENTERIC_KT, ENTERIC_KT);
  const geneticsReduction = geneticsOn ? GENETICS_REDUCTION_KT : 0;
  const slurryResidualPool = Math.max(0, SLURRY_METHANE_KT - slurryReduction);
  const effectiveAd = adOn ? Math.round(0.06 * 0.55 * slurryResidualPool) : 0;
  const adOverstatement = adOn && slurryPct > 0 ? Math.max(0, AD_POTENTIAL_KT - effectiveAd) : 0;

  const userReduction =
    bovaerReduction + nonDairyReduction + slurryReduction +
    fertReduction + peatlandReduction + herdReduction +
    geneticsReduction + effectiveAd;
  const totalReduction = COMMITTED_BASELINE_KT + userReduction;
  const remainingGap = Math.max(0, AGRI_GAP - totalReduction);
  const gapClosedPct = Math.min(100, Math.round((totalReduction / AGRI_GAP) * 100));
  const newProjected2030 = Math.round(NAEI_AGRI_2023 - totalReduction);
  const targetMet = newProjected2030 <= AGRI_TARGET_2030;
  const animalsRemoved = Math.round((herdPct / 100) * TOTAL_CATTLE);
  const scenarioColour = targetMet ? "#16a34a" : "#ef4444";
  const committedProjected2030 = NAEI_AGRI_2023 - COMMITTED_BASELINE_KT;

  const statusMessage =
    gapClosedPct >= 100
      ? `Gap closed. Herd reduction is doing the work that technology cannot. This scenario removes ${animalsRemoved.toLocaleString()} cattle. No current NI policy proposes that.`
      : gapClosedPct >= 88 && herdPct === 0
      ? "At maximum deployment of every available technology, 88% of the gap closes. The remaining ~136 kt cannot be reached without reducing herd size. No current NI policy commits to that."
      : gapClosedPct >= 40 && herdPct === 0
      ? "Significant progress. At these adoption rates, closing the gap entirely requires either pushing every measure to its ceiling or some reduction in herd size."
      : gapClosedPct >= 40
      ? "Significant progress, but a gap remains. Closing it requires either near-maximum deployment of every remaining measure or further herd reduction."
      : "Current interventions fall well short. Even the full government programme leaves a substantial gap without structural change to the herd.";

  const applyPreset = (preset: "techOnly" | "mixed" | "reset") => {
    if (preset === "techOnly") {
      setBovaerPct(90); setNonDairyPct(90); setSlurryPct(80);
      setFertPct(100); setPeatlandHa(10000); setHerdPct(0);
      setGeneticsOn(true); setAdOn(true);
    } else if (preset === "mixed") {
      setBovaerPct(60); setNonDairyPct(50); setSlurryPct(50);
      setFertPct(75); setPeatlandHa(5000); setHerdPct(20);
      setGeneticsOn(true); setAdOn(false);
    } else {
      setBovaerPct(0); setNonDairyPct(0); setSlurryPct(0);
      setFertPct(0); setPeatlandHa(0); setHerdPct(0);
      setGeneticsOn(false); setAdOn(false);
    }
  };

  const xDomain: [number, number] = zoomed ? [2016, 2030] : [1990, 2030];
  const xTickCount = zoomed ? 8 : 5;
  const zoomVisibleValues = [AGRI_TARGET_2030, newProjected2030, committedProjected2030, NAEI_AGRI_2023];
  const yMin = zoomed ? Math.floor((Math.min(...zoomVisibleValues) - 200) / 500) * 500 : 4000;
  const yMax = zoomed ? Math.ceil((Math.max(...zoomVisibleValues) + 200) / 500) * 500 : 6500;
  const yDomain: [number, number] = [yMin, yMax];

  const chartData = AGRICULTURE_PROJECTION.map((point) => {
    if (point.year < 2023) {
      return { year: point.year, actual: point.actual, committed: null as number | null, scenario: null as number | null };
    } else if (point.year === 2023) {
      return { year: point.year, actual: point.actual, committed: NAEI_AGRI_2023, scenario: NAEI_AGRI_2023 };
    } else {
      const t = (point.year - 2023) / 7;
      return {
        year: point.year,
        actual: null as number | null,
        committed: Math.round(NAEI_AGRI_2023 + t * (committedProjected2030 - NAEI_AGRI_2023)),
        scenario: Math.round(NAEI_AGRI_2023 + t * (newProjected2030 - NAEI_AGRI_2023)),
      };
    }
  });

  return (
    <article className="rounded-[2rem] border border-divider bg-surface/70 p-6 shadow-glow sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-env">Scenario modeller</p>
          <h3 className="text-2xl text-ink sm:text-3xl">NI agriculture must cut 1,125 kt CO₂e to meet the 2030 Climate Act target.</h3>
          <p className="text-sm leading-7 text-muted">Adjust the interventions. Watch the trajectory change.</p>
        </div>
        <a
          href="https://climategapni.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-divider bg-page/70 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
        >
          Live site
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-6 space-y-4">

        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-divider">
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted">Projection 2030</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{newProjected2030.toLocaleString()} kt</p>
          </div>
          <div className="border-l border-divider p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted">Target</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-env">{AGRI_TARGET_2030.toLocaleString()} kt</p>
          </div>
          <div className="border-l border-divider p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted">Gap</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${targetMet ? "text-env" : "text-red-400"}`}>
              {remainingGap.toLocaleString()} kt
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-divider bg-page/60 p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted">
            <span>Gap closed</span>
            <span>{gapClosedPct}% of {AGRI_GAP.toLocaleString()} kt</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-divider/80">
            <div
              className={`h-full rounded-full transition-all duration-300 ${targetMet ? "bg-env" : "bg-ocean"}`}
              style={{ width: `${gapClosedPct}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-muted">
            Committed: {COMMITTED_BASELINE_KT} kt · User: {Math.round(userReduction)} kt ·{" "}
            {totalReduction > AGRI_GAP ? (
              <span className="text-env">Surplus: {Math.round(totalReduction - AGRI_GAP)} kt</span>
            ) : (
              <>Remaining: {Math.round(remainingGap)} kt</>
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-divider bg-page/60 p-4">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setZoomed((v) => !v)}
              className={`transition-colors ${zoomed ? "text-ocean" : "text-muted hover:text-ink"}`}
              title={zoomed ? "Show full history" : "Zoom to 2016–2030"}
            >
              {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart
              data={zoomed ? chartData.filter((d) => d.year >= 2016) : chartData}
              margin={{ top: 5, right: 90, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="rgba(50,70,90,0.4)" />
              <XAxis
                dataKey="year"
                type="number"
                domain={xDomain}
                tickCount={xTickCount}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />
              <YAxis
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}Mt`}
                domain={yDomain}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={AGRI_TARGET_2030}
                stroke="#16a34a"
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{ value: "CCC target", position: "right", fontSize: 9, fill: "#16a34a" }}
              />
              <ReferenceLine
                y={NAEI_AGRI_2023}
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="2 2"
                label={{ value: "2023 actual", position: "right", fontSize: 9, fill: "#64748b" }}
              />
              <Area
                type="monotone"
                dataKey="scenario"
                baseValue={AGRI_TARGET_2030}
                fill={targetMet ? "rgba(22,163,74,0.15)" : "rgba(239,68,68,0.12)"}
                fillOpacity={1}
                stroke="none"
                legendType="none"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#94a3b8"
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="committed"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="4 2"
                isAnimationActive={false}
                dot={false}
                connectNulls
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="scenario"
                stroke={scenarioColour}
                strokeWidth={2}
                strokeDasharray="6 4"
                isAnimationActive={true}
                animationDuration={400}
                dot={false}
                connectNulls
              />
              <ReferenceDot
                x={2030}
                y={committedProjected2030}
                r={0}
                label={<RightEdgeReferenceLabel value="Draft CAP" fill="#64748b" dy={10} />}
              />
              <ReferenceDot
                x={2030}
                y={newProjected2030}
                r={0}
                label={<RightEdgeReferenceLabel value="Your scenario" fill={scenarioColour} dy={-10} />}
              />
              {!zoomed && (
                <ReferenceDot
                  x={2005}
                  y={chartData.find((d) => d.year === 2005)?.actual ?? NAEI_AGRI_2023}
                  r={0}
                  label={{ value: "Historical", position: "top", fontSize: 9, fill: "#94a3b8" }}
                />
              )}
              {!targetMet && (
                <ReferenceDot
                  x={2028.85}
                  y={(newProjected2030 + AGRI_TARGET_2030) / 2}
                  r={0}
                  label={{ value: `Gap: ${remainingGap.toLocaleString()} kt`, position: "left", fontSize: 10, fill: "#ef4444" }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-3 text-sm leading-7 text-muted">{statusMessage}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset("techOnly")}
            className="rounded-full border border-divider bg-page/60 px-3 py-1.5 transition-colors hover:border-ocean hover:bg-ocean/10"
          >
            <span className="text-xs font-medium text-ink">Tech only</span>
            <span className="ml-1.5 hidden text-[10px] text-muted sm:inline">No herd reduction</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("mixed")}
            className="rounded-full border border-ocean/40 bg-ocean/5 px-3 py-1.5 transition-colors hover:border-ocean hover:bg-ocean/10"
          >
            <span className="text-xs font-medium text-ink">Mixed</span>
            <span className="ml-1.5 hidden text-[10px] text-muted sm:inline">Closes the gap</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("reset")}
            className="rounded-full border border-divider bg-page/60 px-3 py-1.5 transition-colors hover:border-ocean hover:bg-ocean/10"
          >
            <span className="text-xs font-medium text-ink">Reset</span>
          </button>
        </div>

        <div className="flex flex-col gap-6 pt-2 md:grid md:grid-cols-3 md:border-t md:border-divider md:pt-6">

          <div className="space-y-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] uppercase tracking-widest text-muted">Enteric emissions</p>
              <span className="text-[10px] text-muted">up to {MAX_ENTERIC_KT.toLocaleString()} kt</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Feed additives — dairy (Bovaer)</span>
                <span className="text-xs font-mono font-medium tabular-nums text-ink">{bovaerPct}%</span>
              </div>
              <input
                type="range" min="0" max="90" step="5" value={bovaerPct}
                onChange={(e) => setBovaerPct(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-full outline-none"
                style={{ WebkitAppearance: "none", appearance: "none", background: sliderBg(bovaerPct, 90) }}
              />
              <div className="flex justify-between text-[10px] text-muted/60"><span>0%</span><span>90%</span></div>
              {bovaerReduction > 0 && (
                <p className="text-[11px] text-muted">
                  Saves <span className="font-medium text-ink">{Math.round(bovaerReduction)} kt</span>{" "}
                  <span className="text-env">({pctOfGap(bovaerReduction)}% of gap)</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Feed additives — non-dairy</span>
                <span className="text-xs font-mono font-medium tabular-nums text-ink">{nonDairyPct}%</span>
              </div>
              <input
                type="range" min="0" max="90" step="5" value={nonDairyPct}
                onChange={(e) => setNonDairyPct(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-full outline-none"
                style={{ WebkitAppearance: "none", appearance: "none", background: sliderBg(nonDairyPct, 90) }}
              />
              <div className="flex justify-between text-[10px] text-muted/60"><span>0%</span><span>90%</span></div>
              {nonDairyReduction > 0 && (
                <p className="text-[11px] text-muted">
                  Saves <span className="font-medium text-ink">{Math.round(nonDairyReduction)} kt</span>{" "}
                  <span className="text-env">({pctOfGap(nonDairyReduction)}% of gap)</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5 border-t border-divider pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Cattle herd reduction</span>
                <span className="text-xs font-mono font-medium tabular-nums text-ink">{herdPct}%</span>
              </div>
              <div className="relative">
                <input
                  type="range" min="0" max="50" step="1" value={herdPct}
                  onChange={(e) => setHerdPct(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer rounded-full outline-none"
                  style={{ WebkitAppearance: "none", appearance: "none", background: sliderBgMuted(herdPct, 50) }}
                />
                <div
                  className="pointer-events-none absolute top-0 flex flex-col items-center"
                  style={{ left: `${(GAP_CLOSING_HERD_PCT / 50) * 100}%` }}
                >
                  <div className="mt-1 h-3 w-px bg-muted/50" />
                </div>
              </div>
              <div className="relative flex justify-between text-[10px] text-muted/60">
                <span>0%</span>
                <span
                  className="absolute text-muted"
                  style={{ left: `${(GAP_CLOSING_HERD_PCT / 50) * 100}%`, transform: "translateX(-50%)" }}
                >
                  closes gap
                </span>
                <span>50%</span>
              </div>
              {herdReduction > 0 && (
                <p className="text-[11px] text-muted">
                  Saves <span className="font-medium text-ink">{Math.round(herdReduction)} kt</span>{" "}
                  <span className="text-env">({pctOfGap(herdReduction)}% of gap)</span>
                </p>
              )}
              {herdPct >= GAP_CLOSING_HERD_PCT && herdPct > 0 && (
                <p className="text-[11px] font-medium text-red-400">
                  {herdPct}% = {animalsRemoved.toLocaleString()} fewer cattle
                </p>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setGeneticsOn((v) => !v)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${geneticsOn ? "border-ocean bg-ocean/10 text-ink" : "border-divider bg-page/60 text-muted"}`}
              >
                <span className="block text-xs font-medium">{geneticsOn ? "✓ " : ""}Ruminant genetics</span>
                <span className="text-[10px] tabular-nums">
                  {geneticsOn ? `+${GENETICS_REDUCTION_KT} kt` : `${GENETICS_REDUCTION_KT} kt potential`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAdOn((v) => !v)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${adOn ? "border-ocean bg-ocean/10 text-ink" : "border-divider bg-page/60 text-muted"}`}
              >
                <span className="block text-xs font-medium">{adOn ? "✓ " : ""}Anaerobic digestion</span>
                <span className="text-[10px] tabular-nums">
                  {adOn ? `+${effectiveAd} kt` : `${AD_POTENTIAL_KT} kt potential`}
                </span>
              </button>
              {adOverstatement > 0 && (
                <p className="text-[10px] text-amber-400">
                  AD and slurry aeration draw from the same pool. Combined reduction may overstate by ~{adOverstatement} kt.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-5 md:border-l md:border-divider md:pl-6">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] uppercase tracking-widest text-muted">Slurry & soils</p>
              <span className="text-[10px] text-muted">up to {MAX_SLURRY_SOILS_KT.toLocaleString()} kt</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Slurry aeration</span>
                <span className="text-xs font-mono font-medium tabular-nums text-ink">{slurryPct}%</span>
              </div>
              <input
                type="range" min="0" max="80" step="5" value={slurryPct}
                onChange={(e) => setSlurryPct(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-full outline-none"
                style={{ WebkitAppearance: "none", appearance: "none", background: sliderBg(slurryPct, 80) }}
              />
              <div className="flex justify-between text-[10px] text-muted/60"><span>0%</span><span>80%</span></div>
              {slurryReduction > 0 && (
                <p className="text-[11px] text-muted">
                  Saves <span className="font-medium text-ink">{Math.round(slurryReduction)} kt</span>{" "}
                  <span className="text-env">({pctOfGap(slurryReduction)}% of gap)</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Switch to protected urea</span>
                <span className="text-xs font-mono font-medium tabular-nums text-ink">{fertPct}%</span>
              </div>
              <input
                type="range" min="0" max="100" step="5" value={fertPct}
                onChange={(e) => setFertPct(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-full outline-none"
                style={{ WebkitAppearance: "none", appearance: "none", background: sliderBg(fertPct, 100) }}
              />
              <div className="flex justify-between text-[10px] text-muted/60"><span>0%</span><span>100%</span></div>
              {fertReduction > 0 && (
                <p className="text-[11px] text-muted">
                  Saves <span className="font-medium text-ink">{Math.round(fertReduction)} kt</span>{" "}
                  <span className="text-env">({pctOfGap(fertReduction)}% of gap)</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-5 md:border-l md:border-divider md:pl-6">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] uppercase tracking-widest text-muted">Land use</p>
              <span className="text-[10px] text-muted">up to {MAX_LAND_USE_KT.toLocaleString()} kt</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Peatland restoration</span>
                <span className="text-xs font-mono font-medium tabular-nums text-ink">{peatlandHa.toLocaleString()} ha</span>
              </div>
              <input
                type="range" min="0" max="10000" step="500" value={peatlandHa}
                onChange={(e) => setPeatlandHa(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-full outline-none"
                style={{ WebkitAppearance: "none", appearance: "none", background: sliderBg(peatlandHa, 10000) }}
              />
              <div className="flex justify-between text-[10px] text-muted/60"><span>0</span><span>10,000 ha</span></div>
              {peatlandReduction > 0 && (
                <p className="text-[11px] text-muted">
                  Saves <span className="font-medium text-ink">{Math.round(peatlandReduction)} kt</span>{" "}
                  <span className="text-env">({pctOfGap(peatlandReduction)}% of gap)</span>
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </article>
  );
}
