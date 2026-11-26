import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence, animate, useReducedMotion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/hooks/usePhotos";
import { getCloudinaryUrl } from "@/utils/cloudinary";
import { photoRatios, recordRatio, thumbWidth } from "@/utils/photoRatios";
import { useIsMobile } from "@/hooks/useIsMobile";

interface LightboxProps {
  photo: Photo;
  groupPhotos: Photo[];
  /** Called once the close animation has finished. */
  onClose: () => void;
  /** Tells the group which polaroid is "off the table" as the viewer pages through. */
  onCurrentChange: (id: string) => void;
}

const FULL_WIDTH = 1200;
const OPEN_SPRING = { type: "spring", stiffness: 210, damping: 26, mass: 0.9 } as const;
const CLOSE_EASE = { duration: 0.38, ease: [0.32, 0.72, 0, 1] } as const;

/** Where the polaroid for `id` sits on the page, as a transform relative to `target`. */
function flightFrom(id: string, target: HTMLElement) {
  const origin = document.querySelector<HTMLElement>(`[data-photo-id="${CSS.escape(id)}"]`);
  if (!origin) return null;
  const from = origin.getBoundingClientRect();
  if (from.bottom < 0 || from.top > window.innerHeight) return null; // scrolled out of view: nowhere to fly to
  const to = target.getBoundingClientRect();
  return {
    x: from.left + from.width / 2 - (to.left + to.width / 2),
    y: from.top + from.height / 2 - (to.top + to.height / 2),
    scale: origin.offsetWidth / target.offsetWidth,
    rotate: Number(origin.dataset.rotation ?? 0),
  };
}

/**
 * Shows the copy the scrapbook already loaded straight away, then fades the
 * full-size image over it when it has decoded, so there's no blank frame.
 */
function LightboxImage({ photo, isMobile }: { photo: Photo; isMobile: boolean }) {
  const [sharp, setSharp] = useState(false);
  const ratio = photoRatios.get(photo.id);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 1, background: "#3a3328", aspectRatio: ratio ? String(ratio) : undefined }}>
      <img
        src={getCloudinaryUrl(photo.cloudinaryId, thumbWidth(isMobile))}
        alt={photo.caption || photo.group}
        onLoad={(e) => recordRatio(photo.id, e.currentTarget)}
        draggable={false}
        style={{ display: "block", width: "100%", height: ratio ? "100%" : "auto", objectFit: "cover" }}
      />
      <img
        src={getCloudinaryUrl(photo.cloudinaryId, FULL_WIDTH)}
        alt=""
        aria-hidden
        decoding="async"
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          // decode off the main thread before showing, so the fade never stutters
          img.decode().catch(() => undefined).finally(() => setSharp(true));
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: sharp ? 1 : 0,
          transition: "opacity 0.45s ease",
        }}
      />
    </div>
  );
}

export function Lightbox({ photo, groupPhotos, onClose, onCurrentChange }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(groupPhotos.findIndex((p) => p.id === photo.id));
  const current = groupPhotos[currentIndex];
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  const backdropRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  // Fly the frame up from the polaroid that was clicked. Runs before paint so
  // the frame never flashes at the centre first.
  useLayoutEffect(() => {
    const frame = flightRef.current;
    const backdrop = backdropRef.current;
    if (!frame || !backdrop) return;

    animate(backdrop, { opacity: [0, 1] }, { duration: reduceMotion ? 0.15 : 0.3, ease: "easeOut" });

    const from = reduceMotion ? null : flightFrom(photo.id, frame);
    if (!from) {
      animate(frame, { opacity: [0, 1], scale: [0.96, 1] }, { duration: 0.22, ease: "easeOut" });
      return;
    }
    frame.style.transform = `translate(${from.x}px, ${from.y}px) scale(${from.scale}) rotate(${from.rotate}deg)`;
    animate(
      frame,
      { x: [from.x, 0], y: [from.y, 0], scale: [from.scale, 1], rotate: [from.rotate, 0] },
      OPEN_SPRING,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Put the photo back where it came from, then unmount.
  const requestClose = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    const frame = flightRef.current;
    const backdrop = backdropRef.current;
    if (!frame || !backdrop) return onClose();

    const fade = animate(backdrop, { opacity: 0 }, { duration: 0.3, ease: "easeIn" });
    const to = reduceMotion ? null : flightFrom(current.id, frame);
    const fly = to
      ? animate(frame, { x: to.x, y: to.y, scale: to.scale, rotate: to.rotate }, CLOSE_EASE)
      : animate(frame, { opacity: 0, scale: 0.96 }, { duration: 0.2 });
    await Promise.all([fade, fly]);
    onClose();
  }, [current.id, onClose, reduceMotion]);

  useEffect(() => {
    onCurrentChange(current.id);
  }, [current.id, onCurrentChange]);

  // Warm the neighbours so paging through is instant.
  useEffect(() => {
    for (const p of [groupPhotos[currentIndex - 1], groupPhotos[currentIndex + 1]]) {
      if (!p) continue;
      new Image().src = getCloudinaryUrl(p.cloudinaryId, thumbWidth(isMobile));
      new Image().src = getCloudinaryUrl(p.cloudinaryId, FULL_WIDTH);
    }
  }, [currentIndex, groupPhotos, isMobile]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
      if (e.key === "ArrowRight") setCurrentIndex((i) => Math.min(i + 1, groupPhotos.length - 1));
      if (e.key === "ArrowLeft") setCurrentIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [groupPhotos.length, requestClose]);

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={requestClose}
    >
      {/* Backdrop is its own layer so it can fade without touching the photo. A
          full-screen blur is costly to animate on phones, so mobile uses a
          denser tint instead. */}
      <div
        ref={backdropRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          background: isMobile ? "rgb(var(--color-page) / 0.96)" : "rgb(var(--color-page) / 0.88)",
          backdropFilter: isMobile ? undefined : "blur(18px)",
          WebkitBackdropFilter: isMobile ? undefined : "blur(18px)",
        }}
      />

      {/* Close */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          requestClose();
        }}
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
          position: "relative",
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

          <div ref={flightRef} style={{ flex: 1, minWidth: 0, willChange: "transform" }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50 && canGoNext) setCurrentIndex((i) => i + 1);
                  if (info.offset.x > 50 && canGoPrev) setCurrentIndex((i) => i - 1);
                }}
                style={{
                  background: "linear-gradient(160deg, #ede5ce 0%, #e8ddc4 60%, #e2d6ba 100%)",
                  padding: isMobile ? "10px 10px 36px" : "12px 12px 44px",
                  borderRadius: 2,
                  boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.5)",
                  cursor: "grab",
                }}
              >
                <LightboxImage photo={current} isMobile={isMobile} />
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
                        margin: current.caption ? "3px 0 0" : 0,
                      }}>
                        {current.metadata.location}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

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
    </div>
  );
}
