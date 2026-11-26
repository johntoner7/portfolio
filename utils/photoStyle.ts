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
  x: number;
  yNudge: number;
  rotation: number;
  width: number;
}

export function getPhotoStyle(id: string, index: number, isMobile: boolean): PhotoStyle {
  const isLeft = index % 2 === 0;

  const zoneBase = isLeft ? 0 : 52 - (isMobile ? 6 : 0);
  const x = zoneBase + seededValue(id + "x", 0, isMobile ? 4 : 8);
  const yNudge = seededValue(id + "yn", isMobile ? -25 : -80, isMobile ? 25 : 80);
  const rotMag = seededValue(id + "rm", 2, 7);
  const rotation = (isLeft ? -1 : 1) * rotMag;
  const width = isMobile ? 48 : 42;

  return { x, yNudge, rotation, width };
}

/** Where one photo sits in a desktop spread, in % of the collage width and px from its top. */
export interface SpreadPlacement {
  x: number;
  top: number;
  rotation: number;
  width: number;
}

const SPREAD_ROW_HEIGHT = 372;
// Columns drop by different amounts on alternate rows so a long group reads as scattered, not gridded.
const SPREAD_COLUMN_DROP = [
  [0, 72, 28],
  [64, 8, 92],
];
// Tallest a polaroid gets at the widest column width (portrait photo plus frame).
const SPREAD_PHOTO_HEIGHT = 420;

/**
 * Lays a group out as an overlapping collage, up to three across. One or two
 * photos get wider frames so a short group still fills its page.
 */
export function getSpreadLayout(ids: string[]): { placements: SpreadPlacement[]; height: number } {
  const columns = Math.min(ids.length, 3);
  const width = columns === 1 ? 46 : columns === 2 ? 42 : 31;
  const step = columns === 1 ? 0 : (100 - width - 3) / (columns - 1);

  const placements = ids.map((id, i) => {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const rotMag = seededValue(id + "srm", 1.5, 5);
    return {
      x: (columns === 1 ? 16 : column * step) + seededValue(id + "sx", 0, 4) + (columns === 3 && row % 2 ? 2.5 - column * 1.5 : 0),
      top: row * SPREAD_ROW_HEIGHT + (columns === 3 ? SPREAD_COLUMN_DROP[row % 2][column] : column * 48) + seededValue(id + "sy", -22, 22),
      rotation: (seededValue(id + "sr", -1, 1) < 0 ? -1 : 1) * rotMag,
      width,
    };
  });

  const lowest = Math.max(...placements.map(p => p.top));
  const scale = columns === 3 ? 1 : 1.35; // wider frames are taller
  return { placements, height: lowest + SPREAD_PHOTO_HEIGHT * scale };
}

const TAPE_COLOURS = [
  "rgba(214, 196, 150, 0.72)",
  "rgba(176, 196, 170, 0.68)",
  "rgba(205, 168, 150, 0.68)",
  "rgba(190, 186, 200, 0.66)",
];

/** A strip of washi tape across the top of a polaroid, seeded so it never moves between visits. */
export function getTapeStyle(id: string) {
  return {
    colour: TAPE_COLOURS[Math.floor(seededValue(id + "tc", 0, TAPE_COLOURS.length - 0.001))],
    rotation: seededValue(id + "tr", -9, 9),
    offset: seededValue(id + "to", -14, 14),
    width: seededValue(id + "tw", 30, 40),
  };
}
