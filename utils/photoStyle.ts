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

export function getPhotoStyle(id: string, index: number): PhotoStyle {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const isLeft = index % 2 === 0;

  const zoneBase = isLeft ? 0 : 52 - (isMobile ? 6 : 0);
  const x = zoneBase + seededValue(id + "x", 0, isMobile ? 4 : 8);
  const yNudge = seededValue(id + "yn", isMobile ? -25 : -80, isMobile ? 25 : 80);
  const rotMag = seededValue(id + "rm", 2, 7);
  const rotation = (isLeft ? -1 : 1) * rotMag;
  const width = isMobile ? 48 : 42;

  return { x, yNudge, rotation, width };
}
