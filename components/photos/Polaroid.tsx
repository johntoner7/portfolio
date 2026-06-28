import { motion } from "framer-motion";
import type { Photo } from "@/hooks/usePhotos";
import { getCloudinaryUrl } from "@/utils/cloudinary";
import { getPhotoStyle } from "@/utils/photoStyle";

interface PolaroidProps {
  photo: Photo;
  index: number;
  slotTop: number;
  onOpen: (photo: Photo) => void;
}

export function Polaroid({ photo, index, slotTop, onOpen }: PolaroidProps) {
  const { x, yNudge, rotation, width } = getPhotoStyle(photo.id, index);
  const hasLabel = photo.caption || photo.metadata?.location;

  return (
    <motion.div
      onClick={() => onOpen(photo)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(photo); }}
      aria-label={photo.caption || `Photo from ${photo.group}`}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: slotTop + yNudge,
        width: `${width}%`,
        cursor: "pointer",
        outline: "none",
        transformOrigin: "center center",
      }}
      initial={{ opacity: 0, y: 20, rotate: rotation }}
      whileInView={{ opacity: 1, y: 0, rotate: rotation }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ scale: 1.05, y: -10, rotate: rotation * 0.4, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97, transition: { duration: 0.08 } }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, #ede5ce 0%, #e8ddc4 60%, #e2d6ba 100%)",
          padding: hasLabel ? "9px 9px 10px" : "9px 9px 30px",
          borderRadius: 2,
          boxShadow: "0 8px 28px rgba(0,0,0,0.65), 0 3px 8px rgba(0,0,0,0.4)",
          position: "relative",
          overflow: "hidden",
          transform: "perspective(500px) rotateX(3.5deg)",
        }}
      >
        {/* Paper texture */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.09, zIndex: 1, mixBlendMode: "multiply" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id={`paper-${photo.id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="4" seed="2" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#paper-${photo.id})`} />
        </svg>

        {/* Photo image */}
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 1 }}>
          <img
            src={getCloudinaryUrl(photo.cloudinaryId, 600)}
            alt={photo.caption || photo.group}
            loading={index < 2 ? "eager" : "lazy"}
            fetchPriority={index < 2 ? "high" : "auto"}
            style={{ display: "block", width: "100%", height: "auto" }}
          />
          {/* Film vignette */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
          {/* Warm cast */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(160,100,30,0.06)", pointerEvents: "none", mixBlendMode: "multiply" }} />
          {/* Film grain */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.18, mixBlendMode: "overlay" }} xmlns="http://www.w3.org/2000/svg">
            <filter id={`film-${photo.id}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" seed="5" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#film-${photo.id})`} />
          </svg>
        </div>

        {/* Caption / location */}
        {hasLabel && (
          <div style={{ paddingTop: 8, paddingBottom: 18, position: "relative", zIndex: 2, textAlign: "center" }}>
            {photo.caption && (
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: "italic",
                fontSize: "7.5px",
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
                fontSize: "6.5px",
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
      </div>
    </motion.div>
  );
}
