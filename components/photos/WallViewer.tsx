import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/hooks/usePhotos";
import { getCloudinaryUrl } from "@/utils/cloudinary";

interface WallViewerProps {
  photo: Photo;
  groupPhotos: Photo[];
  onNavigate: (photo: Photo) => void;
  onClose: () => void;
}

const closeBtn: React.CSSProperties = {
  position: "fixed",
  top: 24,
  right: 24,
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "#f0ede6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const navBtn: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  transform: "translateY(-50%)",
  width: 48,
  height: 48,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "#f0ede6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

export function WallViewer({ photo, groupPhotos, onNavigate, onClose }: WallViewerProps) {
  const index = groupPhotos.findIndex((p) => p.id === photo.id);
  const canPrev = index > 0;
  const canNext = index < groupPhotos.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && canNext) onNavigate(groupPhotos[index + 1]);
      if (e.key === "ArrowLeft" && canPrev) onNavigate(groupPhotos[index - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, canPrev, canNext, groupPhotos, onNavigate, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="wall-viewer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(8,6,3,0.88)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onClose}
      >
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            maxWidth: "min(78vw, 900px)",
            maxHeight: "82vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: 12,
              background: "linear-gradient(160deg, #4a3016 0%, #241608 100%)",
              boxShadow: "0 28px 64px rgba(0,0,0,0.65)",
              borderRadius: 2,
            }}
          >
            <div style={{ padding: 10, background: "#f2ead9" }}>
              <img
                src={getCloudinaryUrl(photo.cloudinaryId, 1200)}
                alt={photo.caption || photo.group}
                style={{
                  display: "block",
                  maxWidth: "min(70vw, 820px)",
                  maxHeight: "60vh",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          {(photo.caption || photo.metadata?.location) && (
            <div style={{ marginTop: 18, textAlign: "center" }}>
              {photo.caption && (
                <p
                  style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 15,
                    color: "#f0ede6",
                    margin: 0,
                  }}
                >
                  {photo.caption}
                </p>
              )}
              {photo.metadata?.location && (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(240,237,230,0.55)",
                    margin: "6px 0 0",
                  }}
                >
                  {photo.metadata.location}
                </p>
              )}
            </div>
          )}
        </motion.div>

        <button onClick={onClose} aria-label="Close" style={closeBtn}>
          <X size={20} />
        </button>

        {canPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(groupPhotos[index - 1]); }}
            aria-label="Previous photo"
            style={{ ...navBtn, left: 24 }}
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {canNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(groupPhotos[index + 1]); }}
            aria-label="Next photo"
            style={{ ...navBtn, right: 24 }}
          >
            <ChevronRight size={22} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
