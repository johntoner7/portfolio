export function pctOfGap(kt: number, gap: number): number {
  return Math.round((kt / gap) * 100);
}

export function sliderBg(value: number, max: number): string {
  const pct = (value / max) * 100;
  return `linear-gradient(to right, rgb(37,99,235) 0%, rgb(37,99,235) ${pct}%, rgb(var(--color-divider)) ${pct}%, rgb(var(--color-divider)) 100%)`;
}

export function sliderBgMuted(value: number, max: number): string {
  const pct = (value / max) * 100;
  return `linear-gradient(to right, rgb(100,116,139) 0%, rgb(100,116,139) ${pct}%, rgb(var(--color-divider)) ${pct}%, rgb(var(--color-divider)) 100%)`;
}
