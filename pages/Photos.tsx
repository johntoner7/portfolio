import { useScroll, useTransform, motion } from "framer-motion";
import { usePhotos } from "@/hooks/usePhotos";
import { GrainOverlay } from "@/components/photos/GrainOverlay";
import { YearDivider } from "@/components/photos/YearDivider";
import { PhotoGroup } from "@/components/photos/PhotoGroup";
import { TableObject } from "@/components/photos/TableObject";

export function Photos() {
  const years = usePhotos();
  let globalIndex = 0;

  const { scrollY } = useScroll();
  const lampY = useTransform(scrollY, [0, 2000], [0, -70]);
  const lampOpacity = useTransform(scrollY, [0, 600], [1, 0.7]);

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>

      {/* Room — near-black with very faint warm tone */}
      <div style={{ position: "fixed", inset: 0, background: "#0a0703", zIndex: 0 }} />

      {/* Table container */}
      <div style={{ position: "relative", margin: "0 auto", maxWidth: 760, paddingLeft: "1%", paddingRight: "1%", zIndex: 1 }}>

        {/* ── TABLE SURFACE ─────────────────────────────────── */}
        {/* Base walnut colour — noticeably warmer/browner than before */}
        <div
          style={{
            position: "fixed",
            top: 0, bottom: 0,
            left: "50%", transform: "translateX(-50%)",
            width: "clamp(320px, 98vw, 760px)",
            background: "#2a1a0c",
            zIndex: 1,
          }}
        />

        {/* ── WOOD GRAIN (two-pass) ─────────────────────────── */}
        {/* Pass 1: long horizontal grain lines — low x-freq, high y-freq */}
        <svg
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            pointerEvents: "none", opacity: 0.55, zIndex: 2,
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id="grain-long">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.006 0.28"
              numOctaves="3"
              seed="12"
              stitchTiles="stitch"
              result="noise"
            />
            {/* Desaturate first so turbulence colour channels don't bleed through */}
            <feColorMatrix type="saturate" values="0" result="grey" />
            {/* Then tint warm amber */}
            <feColorMatrix
              in="grey"
              type="matrix"
              values="1    0 0 0 0.10
                      0.75 0 0 0 0.05
                      0.3  0 0 0 0.01
                      0    0 0 1 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-long)" />
        </svg>

        {/* Pass 2: fine surface texture over the grain */}
        <svg
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            pointerEvents: "none", opacity: 0.14, zIndex: 2,
            mixBlendMode: "overlay",
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id="grain-fine">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="4"
              seed="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-fine)" />
        </svg>

        {/* ── LIGHTING ──────────────────────────────────────── */}
        {/* Lamp hotspot — small, bright, warm white */}
        <motion.div
          style={{
            position: "fixed", top: 0,
            left: "50%", x: "-50%", y: lampY,
            opacity: lampOpacity,
            width: "clamp(320px, 98vw, 760px)",
            height: "55vh",
            background:
              "radial-gradient(ellipse 55% 45% at 50% -10%, rgba(255,240,200,0.38) 0%, rgba(240,200,120,0.12) 45%, transparent 100%)",
            pointerEvents: "none", zIndex: 3,
          }}
        />

        {/* Lamp ambient — wide warm amber wash */}
        <motion.div
          style={{
            position: "fixed", top: 0,
            left: "50%", x: "-50%", y: lampY,
            opacity: lampOpacity,
            width: "clamp(320px, 98vw, 760px)",
            height: "85vh",
            background:
              "radial-gradient(ellipse 110% 80% at 50% -30%, rgba(210,145,55,0.14) 0%, transparent 100%)",
            pointerEvents: "none", zIndex: 3,
          }}
        />

        {/* Surface bounce — very faint warm light reflected back up from the table */}
        <div
          style={{
            position: "fixed", bottom: 0,
            left: "50%", transform: "translateX(-50%)",
            width: "clamp(320px, 98vw, 760px)",
            height: "40vh",
            background:
              "radial-gradient(ellipse 80% 60% at 50% 120%, rgba(180,110,30,0.07) 0%, transparent 100%)",
            pointerEvents: "none", zIndex: 3,
          }}
        />

        {/* ── DEPTH / EDGES ─────────────────────────────────── */}
        {/* Inner vignette — corners and far edges of table are darker */}
        <div
          style={{
            position: "fixed", top: 0, bottom: 0,
            left: "50%", transform: "translateX(-50%)",
            width: "clamp(320px, 98vw, 760px)",
            background:
              "radial-gradient(ellipse 80% 60% at 50% 30%, transparent 45%, rgba(0,0,0,0.5) 100%)",
            pointerEvents: "none", zIndex: 4,
          }}
        />

        {/* Left/right edge darkening on the table itself */}
        <div
          style={{
            position: "fixed", top: 0, bottom: 0,
            left: "50%", transform: "translateX(-50%)",
            width: "clamp(320px, 98vw, 760px)",
            background:
              "linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 14%, transparent 86%, rgba(0,0,0,0.5) 100%)",
            pointerEvents: "none", zIndex: 4,
          }}
        />

        {/* Top fade */}
        <div
          style={{
            position: "fixed", top: 0,
            left: "50%", transform: "translateX(-50%)",
            width: "clamp(320px, 98vw, 760px)", height: "100px",
            background: "linear-gradient(to bottom, rgba(8,5,2,0.65) 0%, transparent 100%)",
            pointerEvents: "none", zIndex: 4,
          }}
        />

        {/* Room darkness — left */}
        <div
          style={{
            position: "fixed", top: 0, bottom: 0, left: 0,
            width: "calc(50% - min(49vw, 380px))",
            minWidth: "4vw",
            background: "linear-gradient(to right, #0a0703 60%, transparent 100%)",
            pointerEvents: "none", zIndex: 5,
          }}
        />
        {/* Room darkness — right */}
        <div
          style={{
            position: "fixed", top: 0, bottom: 0, right: 0,
            width: "calc(50% - min(49vw, 380px))",
            minWidth: "4vw",
            background: "linear-gradient(to left, #0a0703 60%, transparent 100%)",
            pointerEvents: "none", zIndex: 5,
          }}
        />
        {/* Mobile edge softening */}
        <div
          style={{
            position: "fixed", top: 0, bottom: 0,
            left: "50%", transform: "translateX(-50%)",
            width: "clamp(320px, 98vw, 760px)",
            background:
              "linear-gradient(to right, rgba(8,5,2,0.6) 0%, transparent 9%, transparent 91%, rgba(8,5,2,0.6) 100%)",
            pointerEvents: "none", zIndex: 5,
          }}
        />

        {/* Film grain */}
        <GrainOverlay />

        {/* ── CONTENT ───────────────────────────────────────── */}
        <div style={{ position: "relative", zIndex: 7, paddingTop: 80, paddingBottom: 160 }}>

          <h1
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "15px",
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.75)",
              textAlign: "center",
              marginBottom: 64,
            }}
          >
            photos
          </h1>

          {years.map((yearData, yearIndex) => (
            <div key={yearData.year}>
              <YearDivider year={yearData.year} />
              {yearData.groups.map((group, groupIndex) => {
                const offset = globalIndex;
                globalIndex += group.photos.length;
                return (
                  <div key={group.groupName}>
                    <PhotoGroup photos={group.photos} indexOffset={offset} />
                    {(groupIndex < yearData.groups.length - 1 ||
                      yearIndex < years.length - 1) && (
                      <TableObject seed={`${yearData.year}-${group.groupName}`} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
