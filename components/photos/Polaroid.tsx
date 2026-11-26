import { useState } from "react";
import { motion } from "framer-motion";
import type { Photo } from "@/hooks/usePhotos";
import { getCloudinaryUrl } from "@/utils/cloudinary";
import { getPhotoStyle, getTapeStyle, type SpreadPlacement } from "@/utils/photoStyle";
import { recordRatio, thumbWidth } from "@/utils/photoRatios";

interface PolaroidProps {
  photo: Photo;
  index: number;
  slotTop: number;
  isMobile: boolean;
  onOpen: (photo: Photo) => void;
  /** Desktop spread: position comes from the group's collage, and the frame gets tape and readable labels. */
  placement?: SpreadPlacement;
  /** Hidden while it is open in the lightbox, so it reads as picked up off the table. */
  lifted?: boolean;
}

const SHADOW_REST = "0 8px 28px rgba(0,0,0,0.65), 0 3px 8px rgba(0,0,0,0.4)";
const SHADOW_LIFTED = "0 28px 60px rgba(0,0,0,0.6), 0 10px 20px rgba(0,0,0,0.35)";
const LIFT_SPRING = { type: "spring", stiffness: 300, damping: 24, mass: 0.7 } as const;

const showLabels = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("labels");

export function Polaroid({ photo, index, slotTop, isMobile, onOpen, placement, lifted = false }: PolaroidProps) {
  const scattered = getPhotoStyle(photo.id, index, isMobile);
  const { x, rotation, width } = placement ?? scattered;
  const top = placement ? placement.top : slotTop + scattered.yNudge;
  const tape = placement ? getTapeStyle(photo.id) : null;
  const hasLabel = photo.caption || photo.metadata?.location;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <motion.div
      onClick={() => onOpen(photo)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(photo); }}
      aria-label={photo.caption || `Photo from ${photo.group}`}
      data-photo-id={photo.id}
      data-rotation={rotation}
      style={{
        visibility: lifted ? "hidden" : "visible",
        position: "absolute",
        left: `${x}%`,
        top,
        width: `${width}%`,
        cursor: "pointer",
        outline: "none",
        transformOrigin: "center center",
      }}
      initial={{ opacity: 0, y: 20, rotate: rotation }}
      whileInView={{ opacity: 1, y: 0, rotate: rotation }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      variants={{
        lift: { scale: 1.05, y: -12, rotate: rotation * 0.4, zIndex: 20, transition: LIFT_SPRING },
        press: { scale: 1.02, y: -6, transition: { type: "spring", stiffness: 500, damping: 30 } },
      }}
      whileHover="lift"
      whileTap="press"
    >
      {tape && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -11,
            left: `calc(50% + ${tape.offset}%)`,
            width: `${tape.width}%`,
            height: 22,
            transform: `translateX(-50%) rotate(${tape.rotation}deg)`,
            background: tape.colour,
            // torn ends
            clipPath: "polygon(2% 0, 98% 4%, 100% 30%, 97% 55%, 100% 80%, 98% 100%, 1% 96%, 3% 70%, 0 45%, 2% 20%)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            zIndex: 3,
            pointerEvents: "none",
          }}
        />
      )}
      <motion.div
        variants={{
          lift: { boxShadow: SHADOW_LIFTED, transition: LIFT_SPRING },
          press: { boxShadow: SHADOW_LIFTED },
        }}
        style={{
          background: "linear-gradient(160deg, #ede5ce 0%, #e8ddc4 60%, #e2d6ba 100%)",
          padding: hasLabel ? "9px 9px 10px" : "9px 9px 30px",
          borderRadius: 2,
          boxShadow: SHADOW_REST,
          position: "relative",
          overflow: "hidden",
          transform: "perspective(500px) rotateX(3.5deg)",
        }}
      >
        {/* Paper texture */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.09, zIndex: 1, mixBlendMode: "multiply" }} xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" filter="url(#shared-paper)" />
        </svg>

        {/* Photo image */}
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 1, background: "#3a3328" }}>
          {!error ? (
            <>
              {/* ~1 KB preview: gives the frame its shape almost at once, so the photo resolves in place instead of popping in */}
              <img
                src={getCloudinaryUrl(photo.cloudinaryId, 32)}
                alt=""
                aria-hidden
                decoding="async"
                onLoad={(e) => recordRatio(photo.id, e.currentTarget)}
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  filter: "blur(10px)",
                  transform: "scale(1.08)",
                }}
              />
              <img
                src={getCloudinaryUrl(photo.cloudinaryId, thumbWidth(isMobile))}
                alt={photo.caption || photo.group}
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "auto"}
                decoding="async"
                onLoad={(e) => {
                  recordRatio(photo.id, e.currentTarget);
                  setLoaded(true);
                }}
                onError={() => setError(true)}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: loaded ? 1 : 0,
                  transition: "opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              minHeight: "200px",
              padding: "16px",
              textAlign: "center",
            }}>
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "10px",
                color: "#999",
                lineHeight: 1.5,
                margin: 0,
              }}>
                There's supposed to be a photo here but it's not rendering right now. Hopefully it's an issue with your connection, I'm sure my code is perfect :)
              </p>
            </div>
          )}
          {!error && (
            <>
              {/* Film vignette */}
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
              {/* Warm cast */}
              <div style={{ position: "absolute", inset: 0, background: "rgba(160,100,30,0.06)", pointerEvents: "none", mixBlendMode: "multiply" }} />
              {/* Film grain */}
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.18, mixBlendMode: "overlay" }} xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" filter="url(#shared-film)" />
              </svg>
            </>
          )}
        </div>

        {/* Dev label overlay */}
        {showLabels && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 10,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 4,
          }}>
            <span style={{
              fontFamily: "monospace", fontSize: "9px", color: "#fff",
              wordBreak: "break-all", textAlign: "center", lineHeight: 1.4,
            }}>
              {photo.id}
            </span>
          </div>
        )}

        {/* Caption / location */}
        {hasLabel && (
          <div style={{ paddingTop: placement ? 10 : 8, paddingBottom: placement ? 14 : 18, position: "relative", zIndex: 2, textAlign: "center" }}>
            {photo.caption && (
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: "italic",
                fontSize: placement ? "12px" : "7.5px",
                color: "#6b5a3e",
                letterSpacing: "0.04em",
                margin: 0,
                lineHeight: 1.4,
              }}>
                {photo.caption}
              </p>
            )}
            {photo.metadata?.location && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: placement ? "9.5px" : "6.5px",
                color: "#9a8a6e",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                margin: photo.caption ? "2px 0 0" : 0,
              }}>
                {photo.metadata.location}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
