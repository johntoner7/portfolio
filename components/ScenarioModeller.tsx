import { ExternalLink } from "lucide-react";
import {
  AGRI_GAP,
  DAIRY_ENTERIC_KT,
  NON_DAIRY_ENTERIC_KT,
  SLURRY_METHANE_KT,
  SOIL_FERTILISER_KT,
  BOVAER_EFFICACY,
  PEATLAND_RATE,
  ENTERIC_KT,
  GENETICS_REDUCTION_KT,
  AD_POTENTIAL_KT,
} from "@/lib/niClimateData";
import { useScenarioCalculations } from "@/hooks/useScenarioCalculations";
import { InterventionSlider } from "@/components/InterventionSlider";
import { ScenarioMetrics } from "@/components/scenario/ScenarioMetrics";
import { GapClosedBar } from "@/components/scenario/GapClosedBar";
import { ScenarioChart } from "@/components/scenario/ScenarioChart";
import { PresetButtons } from "@/components/scenario/PresetButtons";
import { InterventionSection } from "@/components/scenario/InterventionSection";
import { ToggleInterventionButton } from "@/components/scenario/ToggleInterventionButton";

const ADJUSTED_GAP = AGRI_GAP - 115;
const GAP_CLOSING_HERD_PCT = Math.ceil((ADJUSTED_GAP / ENTERIC_KT) * 100);
const MAX_ENTERIC_KT = Math.round(
  0.9 * DAIRY_ENTERIC_KT * BOVAER_EFFICACY +
  0.9 * NON_DAIRY_ENTERIC_KT * BOVAER_EFFICACY +
  0.5 * ENTERIC_KT +
  GENETICS_REDUCTION_KT,
);
const MAX_SLURRY_SOILS_KT = Math.round(0.8 * SLURRY_METHANE_KT * 0.4 + SOIL_FERTILISER_KT);
const MAX_LAND_USE_KT = Math.round((10000 * PEATLAND_RATE) / 1000);

export function ScenarioModeller() {
  const { state, setters, calculations, applyPreset } = useScenarioCalculations();

  return (
    <article className="rounded-[2rem] border border-divider bg-surface/70 p-6 shadow-glow sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-env">Scenario modeller</p>
          <h3 className="pb-1 text-2xl text-ink sm:text-3xl">NI agriculture must cut 1,125 kt CO₂e to meet the 2030 Climate Act target.</h3>
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
        <ScenarioMetrics
          newProjected2030={calculations.newProjected2030}
          remainingGap={calculations.remainingGap}
          targetMet={calculations.targetMet}
        />

        <GapClosedBar
          gapClosedPct={calculations.gapClosedPct}
          targetMet={calculations.targetMet}
          userReduction={calculations.userReduction}
          totalReduction={calculations.totalReduction}
          remainingGap={calculations.remainingGap}
        />

        <ScenarioChart
          chartData={calculations.chartData}
          zoomed={state.zoomed}
          onZoomToggle={() => setters.setZoomed((v) => !v)}
          newProjected2030={calculations.newProjected2030}
          committedProjected2030={calculations.committedProjected2030}
          remainingGap={calculations.remainingGap}
          targetMet={calculations.targetMet}
          scenarioColour={calculations.scenarioColour}
          statusMessage={calculations.statusMessage}
        />

        <PresetButtons onApplyPreset={applyPreset} />

        <div className="flex flex-col gap-6 pt-2 md:grid md:grid-cols-3 md:border-t md:border-divider md:pt-6">
          <InterventionSection title="Enteric emissions" maxKt={MAX_ENTERIC_KT}>
            <InterventionSlider
              label="Feed additives — dairy (Bovaer)"
              value={state.bovaerPct}
              onChange={setters.setBovaerPct}
              min={0}
              max={90}
              step={5}
              reduction={calculations.bovaerReduction}
              gapSize={AGRI_GAP}
            />

            <InterventionSlider
              label="Feed additives — non-dairy"
              value={state.nonDairyPct}
              onChange={setters.setNonDairyPct}
              min={0}
              max={90}
              step={5}
              reduction={calculations.nonDairyReduction}
              gapSize={AGRI_GAP}
            />

            <div className="space-y-1.5 border-t border-divider pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Cattle herd reduction</span>
                <span className="text-xs font-mono font-medium tabular-nums text-ink">{state.herdPct}%</span>
              </div>
              <div className="relative">
                <input
                  type="range" min="0" max="50" step="1" value={state.herdPct}
                  onChange={(e) => setters.setHerdPct(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer rounded-full outline-none"
                  style={{
                    WebkitAppearance: "none",
                    appearance: "none",
                    background: `linear-gradient(to right, rgb(100,116,139) 0%, rgb(100,116,139) ${(state.herdPct / 50) * 100}%, rgb(var(--color-divider)) ${(state.herdPct / 50) * 100}%, rgb(var(--color-divider)) 100%)`
                  }}
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
              {calculations.herdReduction > 0 && (
                <p className="text-[11px] text-muted">
                  Saves <span className="font-medium text-ink">{Math.round(calculations.herdReduction)} kt</span>{" "}
                  <span className="text-env">({Math.round((calculations.herdReduction / AGRI_GAP) * 100)}% of gap)</span>
                </p>
              )}
              {state.herdPct >= GAP_CLOSING_HERD_PCT && state.herdPct > 0 && (
                <p className="text-[11px] font-medium text-red-400">
                  {state.herdPct}% = {calculations.animalsRemoved.toLocaleString()} fewer cattle
                </p>
              )}
            </div>

            <div className="space-y-2">
              <ToggleInterventionButton
                label="Ruminant genetics"
                value={GENETICS_REDUCTION_KT}
                isActive={state.geneticsOn}
                onToggle={() => setters.setGeneticsOn((v) => !v)}
              />
              <ToggleInterventionButton
                label="Anaerobic digestion"
                value={state.adOn ? calculations.effectiveAd : AD_POTENTIAL_KT}
                isActive={state.adOn}
                onToggle={() => setters.setAdOn((v) => !v)}
              >
                {calculations.adOverstatement > 0 && (
                  <p className="text-[10px] text-amber-400">
                    AD and slurry aeration draw from the same pool. Combined reduction may overstate by ~{calculations.adOverstatement} kt.
                  </p>
                )}
              </ToggleInterventionButton>
            </div>
          </InterventionSection>

          <InterventionSection title="Slurry & soils" maxKt={MAX_SLURRY_SOILS_KT} hasLeftBorder>
            <InterventionSlider
              label="Slurry aeration"
              value={state.slurryPct}
              onChange={setters.setSlurryPct}
              min={0}
              max={80}
              step={5}
              reduction={calculations.slurryReduction}
              gapSize={AGRI_GAP}
            />

            <InterventionSlider
              label="Switch to protected urea"
              value={state.fertPct}
              onChange={setters.setFertPct}
              min={0}
              max={100}
              step={5}
              reduction={calculations.fertReduction}
              gapSize={AGRI_GAP}
            />
          </InterventionSection>

          <InterventionSection title="Land use" maxKt={MAX_LAND_USE_KT} hasLeftBorder>
            <InterventionSlider
              label="Peatland restoration"
              value={state.peatlandHa}
              onChange={setters.setPeatlandHa}
              min={0}
              max={10000}
              step={500}
              unit="ha"
              reduction={calculations.peatlandReduction}
              gapSize={AGRI_GAP}
            />
          </InterventionSection>
        </div>
      </div>
    </article>
  );
}
