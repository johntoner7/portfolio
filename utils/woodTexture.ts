import * as THREE from "three";

export interface WoodPalette {
  bg: string;
  base: string;
  streaksDark: string[];
  streaksLight: string[];
  glow: string;
  ambient: string;
}

export const darkWoodPalette: WoodPalette = {
  bg: "#14120d",
  base: "#4d3719",
  streaksDark: ["#241708", "#2f1e0d", "#1c1207"],
  streaksLight: ["#6b4c28", "#5c3f1e", "#77572f"],
  glow: "#eecfa0",
  ambient: "#6b5230",
};

export const lightWoodPalette: WoodPalette = {
  bg: "#f2efe9",
  base: "#c8a876",
  streaksDark: ["#a9814f", "#b58c58", "#9c7846"],
  streaksLight: ["#dbc094", "#e0c89c", "#d3b586"],
  glow: "#fff6e0",
  ambient: "#e8d4ac",
};

export function useDocumentTheme() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("light")
    ? "light"
    : "dark";
}

// Draws a set of wavy horizontal grain streaks + plank seams onto a canvas 2D context.
function paintGrain(ctx: CanvasRenderingContext2D, w: number, h: number, strokeColors: string[], alphaScale: number) {
  const plankHeight = h / 6;
  for (let p = 0; p < 6; p++) {
    const y0 = p * plankHeight;
    ctx.strokeStyle = `rgba(0,0,0,${0.35 * alphaScale})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(w, y0);
    ctx.stroke();
  }

  for (let i = 0; i < 90; i++) {
    const y = Math.random() * h;
    const amp = 6 + Math.random() * 18;
    const freq = 0.004 + Math.random() * 0.01;
    const phase = Math.random() * Math.PI * 2;
    const color = strokeColors[i % strokeColors.length];
    ctx.strokeStyle = color;
    ctx.globalAlpha = (0.08 + Math.random() * 0.22) * alphaScale;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const yy = y + Math.sin(x * freq + phase) * amp;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // fine speckle
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = `rgba(0,0,0,${0.05 * alphaScale + Math.random() * 0.05})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

export function makeWoodTextures(palette: WoodPalette) {
  const size = 1024;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = colorCanvas.height = size;
  const cctx = colorCanvas.getContext("2d")!;
  cctx.fillStyle = palette.base;
  cctx.fillRect(0, 0, size, size);
  paintGrain(cctx, size, size, palette.streaksDark, 1);
  paintGrain(cctx, size, size, palette.streaksLight, 0.6);

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext("2d")!;
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, size, size);
  paintGrain(bctx, size, size, ["#3a3a3a", "#2c2c2c", "#444444"], 1);
  paintGrain(bctx, size, size, ["#a8a8a8", "#9a9a9a", "#b4b4b4"], 0.8);

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

  return { colorMap, bumpMap };
}
