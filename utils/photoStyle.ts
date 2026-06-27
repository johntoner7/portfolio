export function seededValue(id: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const magnitude = (Math.abs(hash) % 1000) / 1000;
  const sign = hash < 0 ? -1 : 1;
  const norm = (sign * magnitude + 1) / 2;
  return min + norm * (max - min);
}

export interface PhotoStyle {
  /** % from left edge of the container. Clamped so photo never clips. */
  x: number;
  /** px from top of the photo's vertical slot */
  yNudge: number;
  rotation: number;
  /** % width of the polaroid — slight size variation adds to the thrown feel */
  width: number;
}

export function getPhotoStyle(id: string, index: number): PhotoStyle {
  // Zone-based x: alternate left/right by index, seeded nudge within each zone.
  // Left zone: 3–20%, right zone: 40–57%. Width is fixed at 42% so right edge
  // peaks at 57+42=99% — never clips.
  const isLeft = index % 2 === 0;
  // Left zone:  left edge 1–13%  → visual centre ~22–34% of table
  // Right zone: left edge 45–57% → visual centre ~66–78% of table
  // Both zones span 12pp so neither side dominates. Width is fixed 42%.
  // Left zone: edge 0–10% → visual centre ~21–31%
  // Right zone: edge 47–57% → visual centre ~68–78%
  // Width 42%, so right edge peaks at 99% — never clips.
  // Left zone:  0–10%  → right edge peaks at 52%
  // Right zone: 44–52% → right edge peaks at 94%
  const zoneBase = isLeft ? 0 : 44;
  const x = zoneBase + seededValue(id + "x", 0, 8);

  const yNudge = seededValue(id + "yn", -55, 55);

  // Rotation: index drives the sign so left/right tilts genuinely alternate.
  // Seed drives magnitude so no two photos tilt the same amount.
  const rotMag = seededValue(id + "rm", 2, 7);
  const rotation = (isLeft ? -1 : 1) * rotMag;

  // Width fixed — consistent polaroid look, easier to reason about clipping
  const width = 42;

  return { x, yNudge, rotation, width };
}
