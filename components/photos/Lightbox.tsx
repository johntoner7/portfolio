import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/hooks/usePhotos";
import { getCloudinaryUrl } from "@/utils/cloudinary";
import { useIsMobile } from "@/hooks/useIsMobile";

interface LightboxProps {
  photo: Photo;
  groupPhotos: Photo[];
  onClose: () => void;
}

export function Lightbox({ photo, groupPhotos, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(
    groupPhotos.findIndex((p) => p.id === photo.id)
  );
  const current = groupPhotos[currentIndex];
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrentIndex((i) => Math.min(i + 1, groupPhotos.length - 1));
      if (e.key === "ArrowLeft") setCurrentIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [groupPhotos.length, onClose]);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < groupPhotos.length - 1;

  const navBtn: React.CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.92)",
    color: "#1a1008",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    flexShrink: 0,
  };

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(var(--color-page), 0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
        onClick={onClose}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: isMobile ? 64 : 16,
            right: 16,
            background: "rgba(255,255,255,0.92)",
            border: "none",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#1a1008",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            zIndex: 201,
          }}
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Photo + nav */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            padding: isMobile ? "0 8px" : "0 16px",
            width: "100%",
            maxWidth: isMobile ? "100%" : 640,
            boxSizing: "border-box",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 16, width: "100%" }}>
            {!isMobile && (
              <div style={{ width: 52, flexShrink: 0 }}>
                {canGoPrev && (
                  <button style={navBtn} onClick={() => setCurrentIndex((i) => i - 1)} aria-label="Previous photo">
                    <ChevronLeft size={22} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}

            {/* Photo — simple scale+fade, no layout morph */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50 && canGoNext) setCurrentIndex((i) => i + 1);
                  if (info.offset.x > 50 && canGoPrev) setCurrentIndex((i) => i - 1);
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "linear-gradient(160deg, #ede5ce 0%, #e8ddc4 60%, #e2d6ba 100%)",
                  padding: isMobile ? "10px 10px 36px" : "12px 12px 44px",
                  borderRadius: 2,
                  boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.5)",
                  cursor: "grab",
                }}
              >
                <img
                  src={getCloudinaryUrl(current.cloudinaryId, 1200)}
                  alt={current.caption || current.group}
                  style={{ display: "block", width: "100%", height: "auto", borderRadius: 1 }}
                />
                {(current.caption || current.metadata?.location) && (
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    {current.caption && (
                      <p style={{
                        fontFamily: "'Lora', Georgia, serif",
                        fontStyle: "italic",
                        fontSize: "12px",
                        color: "#6b5a3e",
                        letterSpacing: "0.03em",
                        margin: 0,
                      }}>
                        {current.caption}
                      </p>
                    )}
                    {current.metadata?.location && (
                      <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "10px",
                        color: "#9a8a6e",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginTop: current.caption ? 3 : 0,
                        margin: current.caption ? "3px 0 0" : 0,
                      }}>
                        {current.metadata.location}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {!isMobile && (
              <div style={{ width: 52, flexShrink: 0 }}>
                {canGoNext && (
                  <button style={navBtn} onClick={() => setCurrentIndex((i) => i + 1)} aria-label="Next photo">
                    <ChevronRight size={22} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile nav buttons */}
          {isMobile && (
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              <button
                style={{ ...navBtn, opacity: canGoPrev ? 1 : 0.25 }}
                onClick={() => canGoPrev && setCurrentIndex((i) => i - 1)}
                aria-label="Previous photo"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
              <button
                style={{ ...navBtn, opacity: canGoNext ? 1 : 0.25 }}
                onClick={() => canGoNext && setCurrentIndex((i) => i + 1)}
                aria-label="Next photo"
              >
                <ChevronRight size={22} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
