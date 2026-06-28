const fullFixed: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
};

export function TableBackground() {
  return (
    <>
      {/* Base — follows the theme variable */}
      <div style={{ ...fullFixed, background: "var(--background)", zIndex: 0 }} />

      {/* Subtle radial highlight */}
      <div style={{ ...fullFixed, zIndex: 1,
        background: "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(255,255,255,0.025) 0%, transparent 100%)" }}
      />

      {/* Faint cool-blue rim light */}
      <div style={{ ...fullFixed, zIndex: 1,
        background: "radial-gradient(ellipse 60% 18% at 50% 0%, rgba(37,99,235,0.06) 0%, transparent 100%)" }}
      />

      {/* Vignette */}
      <div style={{ ...fullFixed, zIndex: 2,
        background: "radial-gradient(ellipse 85% 70% at 50% 40%, transparent 40%, rgba(0,0,0,0.3) 100%)" }}
      />

      {/* Grain — single SVG, two blend layers */}
      <svg style={{ ...fullFixed, zIndex: 3, width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="surface-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" seed="7" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#surface-grain)" opacity="0.09" style={{ mixBlendMode: "overlay" }} />
        <rect width="100%" height="100%" filter="url(#surface-grain)" opacity="0.35" style={{ mixBlendMode: "overlay" }} />
      </svg>

      {/* Top fade */}
      <div style={{ ...fullFixed, bottom: "auto", height: 120, zIndex: 4,
        background: "linear-gradient(to bottom, var(--background) 0%, transparent 100%)" }}
      />

      {/* Bottom fade */}
      <div style={{ ...fullFixed, top: "auto", height: 100, zIndex: 4,
        background: "linear-gradient(to top, var(--background) 0%, transparent 100%)" }}
      />

    </>
  );
}
