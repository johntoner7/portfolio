import * as THREE from "three";

/**
 * A soft puff on a transparent ground, used as a billboard for the cloud
 * bank outside the window. Several overlapping radial gradients rather than
 * one, so the silhouette is lumpy instead of a perfect oval.
 */
export function makeCloudTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext("2d")!;

  // seeded so every visit gets the same cloud, like the rain
  let seed = 20260827;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const blob = (x: number, y: number, r: number) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  for (let i = 0; i < 9; i++) {
    const x = size * (0.18 + random() * 0.64);
    const y = canvas.height * (0.42 + random() * 0.3);
    blob(x, y, size * (0.09 + random() * 0.1));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
