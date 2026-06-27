import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/hooks/usePhotos";
import { getCloudinaryUrl } from "@/utils/cloudinary";

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
          background: "rgba(8,5,2,0.88)",
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
            top: 16,
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

        {/* Photo + nav row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "0 16px",
            width: "100%",
            maxWidth: 640,
            boxSizing: "border-box",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Prev button — always in layout so photo stays centred */}
          <div style={{ width: 52, flexShrink: 0 }}>
            {canGoPrev && (
              <button
                style={navBtn}
                onClick={() => setCurrentIndex((i) => i - 1)}
                aria-label="Previous photo"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Photo */}
          <motion.div
            key={current.id}
            layoutId={`photo-${current.id}`}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60 && canGoNext) setCurrentIndex((i) => i + 1);
              if (info.offset.x > 60 && canGoPrev) setCurrentIndex((i) => i - 1);
            }}
            /* Picking-up feel: photo straightens out and lifts as it expands */
            initial={{ rotate: 0, scale: 0.92, y: 20 }}
            animate={{ rotate: 0, scale: 1, y: 0 }}
            transition={{
              layout: { type: "spring", stiffness: 320, damping: 30 },
              scale: { type: "spring", stiffness: 320, damping: 28 },
              y: { type: "spring", stiffness: 320, damping: 28 },
            }}
            style={{
              flex: 1,
              minWidth: 0,
              background: "linear-gradient(160deg, #ede5ce 0%, #e8ddc4 60%, #e2d6ba 100%)",
              padding: "12px 12px 40px",
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
            {current.caption && (
              <p
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontStyle: "italic",
                  fontSize: "12px",
                  color: "#6b5a3e",
                  marginTop: 10,
                  textAlign: "center",
                  letterSpacing: "0.03em",
                }}
              >
                {current.caption}
              </p>
            )}
          </motion.div>

          {/* Next button */}
          <div style={{ width: 52, flexShrink: 0 }}>
            {canGoNext && (
              <button
                style={navBtn}
                onClick={() => setCurrentIndex((i) => i + 1)}
                aria-label="Next photo"
              >
                <ChevronRight size={22} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
