export function GrainOverlay() {
  return (
    <svg
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        mixBlendMode: "overlay",
        opacity: 0.35,
        zIndex: 6,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="grain-overlay">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.68"
          numOctaves="3"
          seed="11"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-overlay)" />
    </svg>
  );
}
