import { type MotionValue, motion } from "framer-motion";
import { GrainOverlay } from "./GrainOverlay";

const TABLE_WIDTH = "clamp(320px, 98vw, 760px)";
const ROOM_BG = "#0a0703";

const tableLayer: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  width: TABLE_WIDTH,
  pointerEvents: "none",
};

interface Props {
  lampY: MotionValue<number>;
  lampOpacity: MotionValue<number>;
}

export function TableBackground({ lampY, lampOpacity }: Props) {
  return (
    <>
      {/* Room */}
      <div style={{ position: "fixed", inset: 0, background: ROOM_BG, zIndex: 0 }} />

      {/* Table surface */}
      <div style={{ ...tableLayer, top: 0, bottom: 0, background: "#2a1a0c", zIndex: 1 }} />

      {/* Wood grain — long horizontal lines */}
      <div style={{ ...tableLayer, top: 0, bottom: 0, zIndex: 2, opacity: 0.55 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
          <filter id="grain-long">
            <feTurbulence type="turbulence" baseFrequency="0.006 0.28" numOctaves="3" seed="12" stitchTiles="stitch" result="noise" />
            <feColorMatrix type="saturate" values="0" result="grey" />
            <feColorMatrix in="grey" type="matrix" values="1    0 0 0 0.10  0.75 0 0 0 0.05  0.3 0 0 0 0.01  0 0 0 1 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-long)" />
        </svg>
      </div>

      {/* Wood grain — fine surface texture */}
      <div style={{ ...tableLayer, top: 0, bottom: 0, zIndex: 2, opacity: 0.14, mixBlendMode: "overlay" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
          <filter id="grain-fine">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" seed="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-fine)" />
        </svg>
      </div>

      {/* Lamp hotspot */}
      <motion.div style={{ ...tableLayer, top: 0, height: "55vh", y: lampY, opacity: lampOpacity, zIndex: 3,
        background: "radial-gradient(ellipse 55% 45% at 50% -10%, rgba(255,240,200,0.38) 0%, rgba(240,200,120,0.12) 45%, transparent 100%)" }}
      />

      {/* Lamp ambient */}
      <motion.div style={{ ...tableLayer, top: 0, height: "85vh", y: lampY, opacity: lampOpacity, zIndex: 3,
        background: "radial-gradient(ellipse 110% 80% at 50% -30%, rgba(210,145,55,0.14) 0%, transparent 100%)" }}
      />

      {/* Surface bounce */}
      <div style={{ ...tableLayer, bottom: 0, height: "40vh", zIndex: 3,
        background: "radial-gradient(ellipse 80% 60% at 50% 120%, rgba(180,110,30,0.07) 0%, transparent 100%)" }}
      />

      {/* Inner vignette */}
      <div style={{ ...tableLayer, top: 0, bottom: 0, zIndex: 4,
        background: "radial-gradient(ellipse 80% 60% at 50% 30%, transparent 45%, rgba(0,0,0,0.5) 100%)" }}
      />

      {/* Left/right edge darkening */}
      <div style={{ ...tableLayer, top: 0, bottom: 0, zIndex: 4,
        background: "linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 14%, transparent 86%, rgba(0,0,0,0.5) 100%)" }}
      />

      {/* Top fade */}
      <div style={{ ...tableLayer, top: 0, height: 100, zIndex: 4,
        background: "linear-gradient(to bottom, rgba(8,5,2,0.65) 0%, transparent 100%)" }}
      />

      {/* Room darkness — sides */}
      {(["left", "right"] as const).map((side) => (
        <div key={side} style={{
          position: "fixed", top: 0, bottom: 0, [side]: 0,
          width: "calc(50% - min(49vw, 380px))",
          minWidth: "4vw",
          background: `linear-gradient(to ${side === "left" ? "right" : "left"}, ${ROOM_BG} 60%, transparent 100%)`,
          pointerEvents: "none", zIndex: 5,
        }} />
      ))}

      {/* Mobile edge softening */}
      <div style={{ ...tableLayer, top: 0, bottom: 0, zIndex: 5,
        background: "linear-gradient(to right, rgba(8,5,2,0.6) 0%, transparent 9%, transparent 91%, rgba(8,5,2,0.6) 100%)" }}
      />

      {/* Film grain overlay */}
      <GrainOverlay />
    </>
  );
}
