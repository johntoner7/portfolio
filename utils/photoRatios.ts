/**
 * width / height of each photo, recorded the first time any copy of it loads.
 * The lightbox reads it to size its frame before the full-size image arrives,
 * so the frame never collapses and then jumps open.
 */
export const photoRatios = new Map<string, number>();

export function recordRatio(id: string, img: HTMLImageElement) {
  if (img.naturalWidth && img.naturalHeight) photoRatios.set(id, img.naturalWidth / img.naturalHeight);
}

/** The width the scrapbook requests, so the lightbox can reuse the copy already in the browser cache. */
export const thumbWidth = (isMobile: boolean) => (isMobile ? 380 : 600);
