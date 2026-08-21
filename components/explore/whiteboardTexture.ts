import * as THREE from "three";

/** Wraps text to a pixel width, using the canvas' own measurement. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export type BoardStat = { value: number; label: string; suffix?: string };

/** Draws the whiteboard: a heading, a few bullet points, and the numbers column. */
export function makeWhiteboardTexture(
  heading: string,
  points: string[],
  stats: BoardStat[],
  board: string,
) {
  const width = 1024;
  const height = 552;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = board;
  ctx.fillRect(0, 0, width, height);

  // faint ghosting from things rubbed out before
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = "#5a6b7a";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(620, 400);
  ctx.bezierCurveTo(700, 350, 800, 430, 900, 380);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const left = 58;
  const columnEdge = 646;

  ctx.font = '700 46px "DM Sans", "Helvetica Neue", sans-serif';
  ctx.fillStyle = "#2f5d8a";
  ctx.textBaseline = "top";
  ctx.fillText(heading.toUpperCase(), left, 46);

  ctx.strokeStyle = "#2f5d8a";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(left, 108);
  ctx.lineTo(left + ctx.measureText(heading.toUpperCase()).width, 112);
  ctx.stroke();

  ctx.font = '500 33px "DM Sans", "Helvetica Neue", sans-serif';
  const inks = ["#3d6b3a", "#2f5d8a", "#8a5a2f"];
  let y = 158;

  points.forEach((point, i) => {
    ctx.fillStyle = inks[i % inks.length];
    const lines = wrap(ctx, point, columnEdge - left - 70);
    // bullet
    ctx.beginPath();
    ctx.arc(left + 10, y + 18, 7, 0, Math.PI * 2);
    ctx.fill();
    lines.forEach((line, j) => {
      ctx.fillText(line, left + 34, y + j * 42);
    });
    y += lines.length * 42 + 26;
  });

  // divider, then the numbers he keeps quoting
  ctx.strokeStyle = "#8a8378";
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(columnEdge, 54);
  ctx.lineTo(columnEdge + 6, 498);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const statLeft = columnEdge + 44;
  ctx.font = '700 27px "DM Sans", "Helvetica Neue", sans-serif';
  ctx.fillStyle = "#8a5a2f";
  ctx.fillText("BY THE NUMBERS", statLeft, 52);

  let statY = 112;
  stats.forEach((stat, i) => {
    ctx.font = '700 52px "DM Sans", "Helvetica Neue", sans-serif';
    ctx.fillStyle = i === 0 ? "#2f5d8a" : "#3d6b3a";
    ctx.fillText(`${stat.value.toLocaleString("en-GB")}${stat.suffix ?? ""}`, statLeft, statY);

    ctx.font = '500 27px "DM Sans", "Helvetica Neue", sans-serif';
    ctx.fillStyle = "#6b6459";
    ctx.fillText(stat.label, statLeft, statY + 58);
    statY += 122;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
