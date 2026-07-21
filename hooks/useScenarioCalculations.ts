import { useState, useMemo } from "react";
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

export interface ScenarioState {
  bovaerPct: number;
  nonDairyPct: number;
  slurryPct: number;
  fertPct: number;
  peatlandHa: number;
  herdPct: number;
  geneticsOn: boolean;
  adOn: boolean;
  zoomed: boolean;
}

export interface ScenarioCalculations {
  bovaerReduction: number;
  nonDairyReduction: number;
  slurryReduction: number;
  fertReduction: number;
  peatlandReduction: number;
  herdReduction: number;
  geneticsReduction: number;
  effectiveAd: number;
  adOverstatement: number;
  userReduction: number;
  totalReduction: number;
  remainingGap: number;
  gapClosedPct: number;
  newProjected2030: number;
  targetMet: boolean;
  animalsRemoved: number;
  scenarioColour: string;
  committedProjected2030: number;
  statusMessage: string;
  chartData: Array<{ year: number; actual: number | null; committed: number | null; scenario: number | null }>;
}

export function useScenarioCalculations() {
  const [bovaerPct, setBovaerPct] = useState(0);
  const [nonDairyPct, setNonDairyPct] = useState(0);
  const [slurryPct, setSlurryPct] = useState(0);
  const [fertPct, setFertPct] = useState(0);
  const [peatlandHa, setPeatlandHa] = useState(0);
  const [herdPct, setHerdPct] = useState(0);
  const [geneticsOn, setGeneticsOn] = useState(false);
  const [adOn, setAdOn] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const calculations = useMemo(() => {
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

    return {
      bovaerReduction,
      nonDairyReduction,
      slurryReduction,
      fertReduction,
      peatlandReduction,
      herdReduction,
      geneticsReduction,
      effectiveAd,
      adOverstatement,
      userReduction,
      totalReduction,
      remainingGap,
      gapClosedPct,
      newProjected2030,
      targetMet,
      animalsRemoved,
      scenarioColour,
      committedProjected2030,
      statusMessage,
      chartData,
    };
  }, [bovaerPct, nonDairyPct, slurryPct, fertPct, peatlandHa, herdPct, geneticsOn, adOn]);

  const applyPreset = (preset: "techOnly" | "mixed" | "reset") => {
    if (preset === "techOnly") {
      setBovaerPct(90);
      setNonDairyPct(90);
      setSlurryPct(80);
      setFertPct(100);
      setPeatlandHa(10000);
      setHerdPct(0);
      setGeneticsOn(true);
      setAdOn(true);
    } else if (preset === "mixed") {
      setBovaerPct(60);
      setNonDairyPct(50);
      setSlurryPct(50);
      setFertPct(75);
      setPeatlandHa(5000);
      setHerdPct(20);
      setGeneticsOn(true);
      setAdOn(false);
    } else {
      setBovaerPct(0);
      setNonDairyPct(0);
      setSlurryPct(0);
      setFertPct(0);
      setPeatlandHa(0);
      setHerdPct(0);
      setGeneticsOn(false);
      setAdOn(false);
    }
  };

  return {
    state: {
      bovaerPct,
      nonDairyPct,
      slurryPct,
      fertPct,
      peatlandHa,
      herdPct,
      geneticsOn,
      adOn,
      zoomed,
    },
    setters: {
      setBovaerPct,
      setNonDairyPct,
      setSlurryPct,
      setFertPct,
      setPeatlandHa,
      setHerdPct,
      setGeneticsOn,
      setAdOn,
      setZoomed,
    },
    calculations,
    applyPreset,
  };
}
