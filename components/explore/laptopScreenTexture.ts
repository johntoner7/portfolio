import * as THREE from "three";

/** A small dashboard UI for the laptop screen — readable from across a desk. */
export function makeLaptopScreenTexture() {
  const width = 512;
  const height = 340;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#121722";
  ctx.fillRect(0, 0, width, height);

  // window chrome
  ctx.fillStyle = "#1d2431";
  ctx.fillRect(0, 0, width, 34);
  ["#e06c5f", "#e0b25f", "#7fbf6a"].forEach((colour, i) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(24 + i * 22, 17, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.font = '600 15px "DM Sans", sans-serif';
  ctx.fillStyle = "#8b97a8";
  ctx.textBaseline = "middle";
  ctx.fillText("scenario modeller", 108, 18);

  // line chart with an area fill
  const plot = { x: 40, y: 76, w: 300, h: 180 };
  ctx.strokeStyle = "#26303f";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = plot.y + (plot.h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
  }

  const series = [0.82, 0.74, 0.78, 0.66, 0.58, 0.62, 0.48, 0.4, 0.34, 0.3];
  const points = series.map((v, i) => ({
    x: plot.x + (plot.w / (series.length - 1)) * i,
    y: plot.y + plot.h - v * plot.h,
  }));

  const gradient = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.h);
  gradient.addColorStop(0, "rgba(132,168,60,0.42)");
  gradient.addColorStop(1, "rgba(132,168,60,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(points[0].x, plot.y + plot.h);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, plot.y + plot.h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#9ccb52";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  // target line
  ctx.strokeStyle = "#e0954a";
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plot.x, plot.y + plot.h * 0.72);
  ctx.lineTo(plot.x + plot.w, plot.y + plot.h * 0.72);
  ctx.stroke();
  ctx.setLineDash([]);

  // sliders down the right-hand side
  const panelX = 366;
  ["#84a83c", "#4aa3c7", "#d98b2b"].forEach((colour, i) => {
    const y = 92 + i * 56;
    ctx.fillStyle = "#8b97a8";
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillText(["herd size", "slurry", "peatland"][i], panelX, y - 12);

    ctx.fillStyle = "#26303f";
    ctx.fillRect(panelX, y, 110, 7);
    ctx.fillStyle = colour;
    ctx.fillRect(panelX, y, [76, 48, 62][i], 7);
    ctx.beginPath();
    ctx.arc(panelX + [76, 48, 62][i], y + 3.5, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#5f6b7c";
  ctx.font = '500 13px "DM Sans", sans-serif';
  ctx.fillText("gap closed", 40, 292);
  ctx.fillStyle = "#9ccb52";
  ctx.font = '700 26px "DM Sans", sans-serif';
  ctx.fillText("61%", 40, 315);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
