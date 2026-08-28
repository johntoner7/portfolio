import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------ colour maths */

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export function hslToHex(h: number, s: number, l: number) {
  const [r, g, b] = hslToRgb(h, s, l);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Hex to HSL, so opening the wheel lands the marker on the current colour. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  if ([r, g, b].some((v) => Number.isNaN(v))) return { h: 210, s: 0.5, l: 0.4 };

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

/* ---------------------------------------------------------------- the wheel */

/**
 * Hue around, saturation out from the middle, lightness on its own slider.
 * A disc rather than a grid because the marker's angle reads as "which
 * colour" at a glance, which is the thing you are actually hunting for.
 */
export function ColourWheel({
  value,
  onChange,
  size = 176,
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hsl, setHsl] = useState(() => hexToHsl(value));

  // follow the colour when it is changed from outside (a preset, say), but
  // not while dragging, which would fight the pointer
  const dragging = useRef(false);
  useEffect(() => {
    if (dragging.current) return;
    const next = hexToHsl(value);
    setHsl((current) =>
      hslToHex(current.h, current.s, current.l).toLowerCase() === value.toLowerCase()
        ? current
        : next,
    );
  }, [value]);

  const radius = size / 2;

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const ctx = node.getContext("2d");
    if (!ctx) return;

    // capped: a 3x backing store for a 176px disc is a lot of pixels to
    // repaint on every lightness step, for no visible gain
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(size * dpr);
    node.width = px;
    node.height = px;

    const image = ctx.createImageData(px, px);
    const mid = px / 2;
    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const dx = x - mid + 0.5;
        const dy = y - mid + 0.5;
        const dist = Math.hypot(dx, dy);
        const i = (y * px + x) * 4;
        if (dist > mid) {
          image.data[i + 3] = 0;
          continue;
        }
        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const [r, g, b] = hslToRgb(hue, Math.min(1, dist / mid), hsl.l);
        image.data[i] = r;
        image.data[i + 1] = g;
        image.data[i + 2] = b;
        // feather the last pixel of the rim so the disc is not jagged
        image.data[i + 3] = dist > mid - dpr ? Math.round(255 * ((mid - dist) / dpr)) : 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [hsl.l, size]);

  const pick = useCallback(
    (clientX: number, clientY: number, lightness: number) => {
      const node = canvas.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const dx = clientX - rect.left - rect.width / 2;
      const dy = clientY - rect.top - rect.height / 2;
      const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      // outside the disc still picks, clamped — dragging past the rim keeps
      // the hue rather than dropping the stroke
      const sat = Math.min(1, Math.hypot(dx, dy) / (rect.width / 2));
      setHsl({ h: hue, s: sat, l: lightness });
      onChange(hslToHex(hue, sat, lightness));
    },
    [onChange],
  );

  const marker = useMemo(() => {
    const angle = (hsl.h * Math.PI) / 180;
    return {
      left: radius + Math.cos(angle) * hsl.s * radius,
      top: radius + Math.sin(angle) * hsl.s * radius,
    };
  }, [hsl.h, hsl.s, radius]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size, touchAction: "none" }}>
        <canvas
          ref={canvas}
          style={{ width: size, height: size, borderRadius: "50%", display: "block", cursor: "crosshair" }}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            pick(e.clientX, e.clientY, hsl.l);
          }}
          onPointerMove={(e) => {
            if (dragging.current) pick(e.clientX, e.clientY, hsl.l);
          }}
          onPointerUp={(e) => {
            dragging.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: marker.left,
            top: marker.top,
            height: 16,
            width: 16,
            marginLeft: -8,
            marginTop: -8,
            borderRadius: "50%",
            background: value,
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.45)",
            pointerEvents: "none",
          }}
        />
      </div>

      <input
        type="range"
        min={5}
        max={95}
        value={Math.round(hsl.l * 100)}
        aria-label="Lightness"
        onChange={(e) => {
          const l = Number(e.target.value) / 100;
          setHsl((c) => ({ ...c, l }));
          onChange(hslToHex(hsl.h, hsl.s, l));
        }}
        style={{
          width: size,
          accentColor: value,
          // the track reads as the ramp it controls
          background: `linear-gradient(to right, ${hslToHex(hsl.h, hsl.s, 0.05)}, ${hslToHex(
            hsl.h,
            hsl.s,
            0.5,
          )}, ${hslToHex(hsl.h, hsl.s, 0.95)})`,
          borderRadius: 999,
          height: 8,
          touchAction: "none",
        }}
      />
    </div>
  );
}
