export const NAEI_AGRI_2023 = 5615;
export const AGRI_TARGET_2030 = 4490;
export const AGRI_GAP = 1125;
export const DAIRY_ENTERIC_KT = 1098;
export const NON_DAIRY_ENTERIC_KT = 2059;
export const ENTERIC_KT = 3157;
export const SLURRY_METHANE_KT = 630;
export const SOIL_FERTILISER_KT = 59;
export const BOVAER_EFFICACY = 0.12;
export const PEATLAND_RATE = 11;
export const GENETICS_REDUCTION_KT = 17;
export const AD_POTENTIAL_KT = 21;
export const COMMITTED_BASELINE_KT = 242;
export const TOTAL_CATTLE = 1673345;

export type AgricultureProjectionPoint = {
  year: number;
  actual: number | null;
  projected: number | null;
};

export const AGRICULTURE_PROJECTION: AgricultureProjectionPoint[] = [
  { year: 1990, actual: 5198.7, projected: null },
  { year: 1995, actual: 5656.5, projected: null },
  { year: 1998, actual: 5808.5, projected: null },
  { year: 1999, actual: 5742.0, projected: null },
  { year: 2000, actual: 5573.8, projected: null },
  { year: 2001, actual: 5573.5, projected: null },
  { year: 2002, actual: 5558.1, projected: null },
  { year: 2003, actual: 5600.6, projected: null },
  { year: 2004, actual: 5586.1, projected: null },
  { year: 2005, actual: 5659.1, projected: null },
  { year: 2006, actual: 5547.8, projected: null },
  { year: 2007, actual: 5476.9, projected: null },
  { year: 2008, actual: 5353.9, projected: null },
  { year: 2009, actual: 5316.1, projected: null },
  { year: 2010, actual: 5414.9, projected: null },
  { year: 2011, actual: 5394.5, projected: null },
  { year: 2012, actual: 5516.2, projected: null },
  { year: 2013, actual: 5490.7, projected: null },
  { year: 2014, actual: 5492.6, projected: null },
  { year: 2015, actual: 5654.0, projected: null },
  { year: 2016, actual: 5720.0, projected: null },
  { year: 2017, actual: 5774.5, projected: null },
  { year: 2018, actual: 5645.7, projected: null },
  { year: 2019, actual: 5645.5, projected: null },
  { year: 2020, actual: 5684.0, projected: null },
  { year: 2021, actual: 5860.7, projected: null },
  { year: 2022, actual: 5708.7, projected: null },
  { year: 2023, actual: 5615.2, projected: 5615.2 },
  { year: 2024, actual: null, projected: 5615 },
  { year: 2025, actual: null, projected: 5615 },
  { year: 2026, actual: null, projected: 5615 },
  { year: 2027, actual: null, projected: 5615 },
  { year: 2028, actual: null, projected: 5615 },
  { year: 2029, actual: null, projected: 5615 },
  { year: 2030, actual: null, projected: 5615 },
];
