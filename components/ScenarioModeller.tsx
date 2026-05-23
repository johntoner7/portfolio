"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import {
  AGRICULTURE_PROJECTION,
  AGRI_GAP,
  AGRI_TARGET_2030,
  AD_POTENTIAL_KT,
  BOVAER_EFFICACY,
  COMMITTED_BASELINE_KT,
  DAIRY_ENTERIC_KT,
  ENTERIC_KT,
  GENETICS_REDUCTION_KT,
  NAEI_AGRI_2023,
  NON_DAIRY_ENTERIC_KT,
  PEATLAND_RATE,
  SLURRY_METHANE_KT,
  SOIL_FERTILISER_KT,
  TOTAL_CATTLE,
} from "@/lib/niClimateData";

type ScenarioState = {
  bovaerPct: number;
  nonDairyPct: number;
  slurryPct: number;
  fertPct: number;
  peatlandHa: number;
  herdPct: number;
  geneticsOn: boolean;
  adOn: boolean;
};

const defaultScenario: ScenarioState = {
  bovaerPct: 0,
  nonDairyPct: 0,
  slurryPct: 0,
  fertPct: 0,
  peatlandHa: 0,
  herdPct: 0,
  geneticsOn: false,
  adOn: false,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rangeLabel(value: number, max: number) {
  return `${Math.round((value / max) * 100)}%`;
}

function Slider({
  label,
  value,
  max,
  step,
  onChange,
  accent = "#2563eb",
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  accent?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-muted">
      <div className="flex items-center justify-between gap-4 text-ink">
        <span>{label}</span>
        <span className="text-xs uppercase tracking-[0.24em] text-muted">{rangeLabel(value, max)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-divider outline-none"
        style={{
          background: `linear-gradient(to right, ${accent} 0%, ${accent} ${(value / max) * 100}%, rgb(var(--color-divider)) ${(value / max) * 100}%, rgb(var(--color-divider)) 100%)`,
        }}
      />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={[
        "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
        value ? "border-ocean bg-ocean/10 text-ink" : "border-divider bg-page/60 text-muted",
      ].join(" ")}
    >
      <span>{label}</span>
         <span className={["rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.24em]", value ? "bg-ocean text-white" : "bg-surface text-muted"].join(" ")}>
        {value ? "On" : "Off"}
      </span>
    </button>
  );
}

function SparkLineChart({ points, scenarioPoints, target }: { points: Array<{ year: number; value: number }>; scenarioPoints: Array<{ year: number; value: number }>; target: number; }) {
  const width = 520;
  const height = 220;
  const padding = 20;
  const yAxisWidth = 46;
  const allValues = [...points.map((point) => point.value), ...scenarioPoints.map((point) => point.value), target];
  const minValue = Math.min(...allValues) * 0.95;
  const maxValue = Math.max(...allValues) * 1.05;
  const chartWidth = width - padding * 2 - yAxisWidth;
  const chartLeft = padding + yAxisWidth;
  const xScale = (year: number) => chartLeft + ((year - 1990) / (2030 - 1990)) * chartWidth;
  const yScale = (value: number) => height - padding - ((value - minValue) / (maxValue - minValue)) * (height - padding * 2);
  const toPath = (series: Array<{ year: number; value: number }>) =>
    series.map((point, index) => `${index === 0 ? "M" : "L"}${xScale(point.year)},${yScale(point.value)}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => minValue + (maxValue - minValue) * ratio);
  const xTicks = [1990, 2000, 2010, 2020, 2030];

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full text-muted" role="img" aria-label="Scenario chart">
        <line x1={chartLeft} y1={padding} x2={chartLeft} y2={height - padding} stroke="rgb(148 163 184)" strokeWidth="1" />
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={chartLeft - 4} y1={yScale(tick)} x2={chartLeft} y2={yScale(tick)} stroke="rgb(148 163 184)" strokeWidth="1" />
            <text x={chartLeft - 8} y={yScale(tick) + 3} textAnchor="end" className="fill-muted text-[10px]">
              {Math.round(tick).toLocaleString()}
            </text>
          </g>
        ))}
        <line x1={chartLeft} y1={yScale(target)} x2={width - padding} y2={yScale(target)} stroke="rgb(21 128 61)" strokeDasharray="5 4" />
        <path d={toPath(points)} fill="none" stroke="rgb(148 163 184)" strokeWidth="2" strokeLinecap="round" />
        <path d={toPath(scenarioPoints)} fill="none" stroke="rgb(37 99 235)" strokeWidth="3" strokeLinecap="round" />
        {scenarioPoints.map((point) => (
          <circle key={point.year} cx={xScale(point.year)} cy={yScale(point.value)} r={2.5} fill="rgb(37 99 235)" />
        ))}
        {xTicks.map((year) => (
          <g key={year}>
            <line x1={xScale(year)} y1={height - padding} x2={xScale(year)} y2={height - padding + 4} stroke="rgb(148 163 184)" strokeWidth="1" />
            <text x={xScale(year)} y={height - 4} textAnchor="middle" className="fill-muted text-[10px]">
              {year}
            </text>
          </g>
        ))}
        <text x={padding} y={10} className="fill-muted text-[10px] uppercase tracking-[0.24em]">kt CO2e</text>
        <text x={width - padding} y={height - padding - 6} textAnchor="end" className="fill-muted text-[10px] uppercase tracking-[0.24em]">Year</text>
      </svg>
    </>
  );
}

export function ScenarioModeller() {
  const [scenario, setScenario] = useState<ScenarioState>(defaultScenario);

  const derived = useMemo(() => {
    const bovaerReduction = Math.min((scenario.bovaerPct / 100) * DAIRY_ENTERIC_KT * BOVAER_EFFICACY, DAIRY_ENTERIC_KT);
    const nonDairyReduction = Math.min((scenario.nonDairyPct / 100) * NON_DAIRY_ENTERIC_KT * BOVAER_EFFICACY, NON_DAIRY_ENTERIC_KT);
    const slurryReduction = Math.min((scenario.slurryPct / 100) * SLURRY_METHANE_KT * 0.4, SLURRY_METHANE_KT);
    const fertReduction = Math.min((scenario.fertPct / 100) * SOIL_FERTILISER_KT, SOIL_FERTILISER_KT);
    const peatlandReduction = (scenario.peatlandHa * PEATLAND_RATE) / 1000;
    const herdReduction = Math.min((scenario.herdPct / 100) * ENTERIC_KT, ENTERIC_KT);
    const geneticsReduction = scenario.geneticsOn ? GENETICS_REDUCTION_KT : 0;
    const slurryResidualPool = Math.max(0, SLURRY_METHANE_KT - slurryReduction);
    const effectiveAd = scenario.adOn ? Math.round(0.06 * 0.55 * slurryResidualPool) : 0;
    const userReduction = bovaerReduction + nonDairyReduction + slurryReduction + fertReduction + peatlandReduction + herdReduction + geneticsReduction + effectiveAd;
    const totalReduction = COMMITTED_BASELINE_KT + userReduction;
    const remainingGap = Math.max(0, AGRI_GAP - totalReduction);
    const gapClosedPct = Math.min(100, Math.round((totalReduction / AGRI_GAP) * 100));
    const newProjected2030 = Math.round(NAEI_AGRI_2023 - totalReduction);
    const targetMet = newProjected2030 <= AGRI_TARGET_2030;
    const animalsRemoved = Math.round((scenario.herdPct / 100) * TOTAL_CATTLE);

    return { totalReduction, remainingGap, gapClosedPct, newProjected2030, targetMet, animalsRemoved };
  }, [scenario]);

  const scenarioSeries = useMemo(() => {
    const start = NAEI_AGRI_2023;
    const end = derived.newProjected2030;
    return AGRICULTURE_PROJECTION.filter((point) => point.year >= 2023).map((point) => ({
      year: point.year,
      value: point.year === 2023 ? start : start + ((point.year - 2023) / 7) * (end - start),
    }));
  }, [derived.newProjected2030]);

  const baseSeries = useMemo(() => {
    return AGRICULTURE_PROJECTION.filter((point) => point.actual != null).map((point) => ({
      year: point.year,
      value: point.actual ?? point.projected ?? 0,
    }));
  }, []);

  const statusMessage =
    derived.gapClosedPct >= 100
      ? `Gap closed. This scenario removes ${derived.animalsRemoved.toLocaleString()} cattle.`
      : derived.gapClosedPct >= 40 && scenario.herdPct === 0
      ? "Even at strong uptake, the gap still remains without structural change to livestock numbers."
      : derived.gapClosedPct >= 40
      ? "Meaningful progress, but the target still needs either more uptake or some herd reduction."
      : "Current interventions still fall short of the 2030 target.";

  return (
    <article className="rounded-[2rem] border border-divider bg-surface/70 p-6 shadow-glow sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-env">Scenario modeller</p>
          <h3 className="text-2xl text-ink sm:text-3xl">NI agriculture must cut 1,125 kt CO2e to meet the 2030 Climate Act target.</h3>
          <p className="text-sm leading-7 text-muted">
            Use the sliders to test different intervention combinations and see how far each gets toward closing that gap.
          </p>
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

      <div className="mt-6 grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Slider label="Bovaer uptake" value={scenario.bovaerPct} max={90} step={5} onChange={(value) => setScenario((current) => ({ ...current, bovaerPct: value }))} />
          <Slider label="Non-dairy uptake" value={scenario.nonDairyPct} max={90} step={5} onChange={(value) => setScenario((current) => ({ ...current, nonDairyPct: value }))} accent="rgb(22 163 74)" />
          <Slider label="Slurry aeration" value={scenario.slurryPct} max={80} step={5} onChange={(value) => setScenario((current) => ({ ...current, slurryPct: value }))} accent="rgb(148 163 184)" />
          <Slider label="Protected urea" value={scenario.fertPct} max={100} step={5} onChange={(value) => setScenario((current) => ({ ...current, fertPct: value }))} accent="rgb(245 158 11)" />
          <Slider label="Peatland restored (ha)" value={scenario.peatlandHa} max={10000} step={250} onChange={(value) => setScenario((current) => ({ ...current, peatlandHa: clamp(value, 0, 10000) }))} accent="rgb(16 185 129)" />
          <Slider label="Herd reduction" value={scenario.herdPct} max={50} step={5} onChange={(value) => setScenario((current) => ({ ...current, herdPct: value }))} accent="rgb(220 38 38)" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Genetics programme" value={scenario.geneticsOn} onChange={(value) => setScenario((current) => ({ ...current, geneticsOn: value }))} />
          <Toggle label="Anaerobic digestion" value={scenario.adOn} onChange={(value) => setScenario((current) => ({ ...current, adOn: value }))} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-divider bg-page/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Projected 2030</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{derived.newProjected2030.toLocaleString()} kt</p>
          </div>
          <div className="rounded-2xl border border-divider bg-page/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Target</p>
            <p className="mt-2 text-2xl font-semibold text-env">{AGRI_TARGET_2030.toLocaleString()} kt</p>
          </div>
          <div className="rounded-2xl border border-divider bg-page/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Remaining gap</p>
            <p className={[
              "mt-2 text-2xl font-semibold",
              derived.targetMet ? "text-env" : "text-ocean",
            ].join(" ")}>
              {derived.remainingGap.toLocaleString()} kt
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-divider bg-page/60 p-4">
          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.24em] text-muted">
            <span>Gap closed</span>
            <span>{derived.gapClosedPct}% of {AGRI_GAP.toLocaleString()} kt</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-divider/80">
            <div className={`h-full rounded-full ${derived.targetMet ? "bg-env" : "bg-ocean"}`} style={{ width: `${derived.gapClosedPct}%` }} />
          </div>
          <p className="mt-3 text-sm leading-7 text-muted">{statusMessage}</p>
        </div>

        <div className="rounded-2xl border border-divider bg-page/60 p-4">
          <SparkLineChart points={baseSeries} scenarioPoints={scenarioSeries} target={AGRI_TARGET_2030} />
        </div>
      </div>
    </article>
  );
}
