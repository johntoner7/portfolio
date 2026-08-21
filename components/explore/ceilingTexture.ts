import * as THREE from "three";

/**
 * A quiet panelled-ceiling pattern: a grid of tiles with a faint inset border
 * and a little noise, so the ceiling reads as a surface rather than flat fill.
 */
export function makeCeilingTextures(base: string, line: string) {
  const size = 512;
  const tiles = 4;
  const step = size / tiles;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = colorCanvas.height = size;
  const ctx = colorCanvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let x = 0; x < tiles; x++) {
    for (let y = 0; y < tiles; y++) {
      const ox = x * step;
      const oy = y * step;
      // inset panel
      ctx.strokeStyle = line;
      ctx.globalAlpha = 0.07;
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + step * 0.12, oy + step * 0.12, step * 0.76, step * 0.76);
      // tile seam
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 3;
      ctx.strokeRect(ox, oy, step, step);
    }
  }

  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = i % 2 === 0 ? line : "#ffffff";
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext("2d")!;
  bctx.fillStyle = "#8a8a8a";
  bctx.fillRect(0, 0, size, size);
  for (let x = 0; x < tiles; x++) {
    for (let y = 0; y < tiles; y++) {
      const ox = x * step;
      const oy = y * step;
      bctx.strokeStyle = "#3a3a3a";
      bctx.lineWidth = 4;
      bctx.strokeRect(ox, oy, step, step);
      bctx.strokeStyle = "#c4c4c4";
      bctx.lineWidth = 2;
      bctx.strokeRect(ox + step * 0.12, oy + step * 0.12, step * 0.76, step * 0.76);
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}
