import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronUp, Compass, Info } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useThemeMode } from "@/hooks/useThemeMode";
import { exploreItems } from "@/components/explore/exploreItems";
import { ExplorePanel } from "@/components/explore/ExplorePanel";
import { ExploreCredits } from "@/components/explore/ExploreCredits";
import { PhotoScrapbook } from "@/components/photos/PhotoScrapbook";
import type { PlayerHandle } from "@/components/explore/ExploreScene";

const ExploreScene = lazy(() =>
  import("@/components/explore/ExploreScene").then((m) => ({ default: m.ExploreScene })),
);

const overlayButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 44, // thumb-sized rather than cursor-sized
  touchAction: "manipulation",
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgb(var(--color-divider))",
  background: "rgb(var(--color-surface) / 0.8)",
  backdropFilter: "blur(8px)",
  color: "rgb(var(--color-ink))",
  fontSize: 13,
  textDecoration: "none",
  cursor: "pointer",
};

export function Explore() {
  const theme = useThemeMode();
  const isMobile = useIsMobile();
  // below 900px the panel is a bottom sheet and sits over the walk button;
  // above it, the panel is a side rail and the room stays usable behind it
  const panelIsSheet = useIsMobile(900);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(true);
  const [pressed, setPressed] = useState(false);

  const navigate = useNavigate();
  const walking = useRef(false);
  const recentre = useRef<(() => void) | null>(null);
  const sitDown = useRef<((done: () => void) => void) | null>(null);
  const handle: PlayerHandle = useMemo(() => ({ walking, recentre, sitDown }), []);
  const [leaving, setLeaving] = useState(false);
  const [arriving, setArriving] = useState(true);
  // the controls stay out of the way until the stand-up move has finished
  const [introDone, setIntroDone] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  // which page the fade-out is heading for, which decides what it fades to
  const [exitTo, setExitTo] = useState<"site" | "photos">("site");
  const exitTimer = useRef<number | null>(null);
  // the scrapbook opens in place, over the room, rather than navigating away
  const [photosOpen, setPhotosOpen] = useState(false);

  const selected = useMemo(
    () => exploreItems.find((item) => item.id === selectedId) ?? null,
    [selectedId],
  );

  const dismissHint = useCallback(() => setHintVisible(false), []);
  const handleSelect = useCallback(
    (id: string) => {
      setHintVisible(false);
      const item = exploreItems.find((entry) => entry.id === id);
      // the laptop is the way back: sit down at it and the site comes up
      if (item?.exitsToSite) {
        walking.current = false;
        setExitTo("site");
        setLeaving(true);
        sitDown.current?.(() => {
          // land at the top of the site, not deep-linked into a section
          window.scrollTo(0, 0);
          navigate("/");
          window.requestAnimationFrame(() => window.scrollTo(0, 0));
        });
        return;
      }
      /*
       * The pinboard opens the same scrapbook the real gallery uses, but in
       * place over the room rather than navigating to /photos — clicking an
       * object already walks the camera up to it, so the fade runs over
       * that approach: you step up to the board, it dissolves, and the
       * scrapbook is what you land on, with the room still right behind it.
       */
      if (item?.opensPhotos) {
        walking.current = false;
        setExitTo("photos");
        setLeaving(true);
        if (exitTimer.current) window.clearTimeout(exitTimer.current);
        exitTimer.current = window.setTimeout(() => {
          setPhotosOpen(true);
          document.body.style.overflow = "";
          window.scrollTo(0, 0);
          setLeaving(false);
        }, 820);
        return;
      }
      setSelectedId(id);
    },
    [navigate],
  );

  const closePhotos = useCallback(() => {
    setLeaving(true);
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => {
      setPhotosOpen(false);
      document.body.style.overflow = "hidden";
      window.scrollTo(0, 0);
      setLeaving(false);
    }, 820);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setHintVisible(false), 9000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(
    () => () => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    },
    [],
  );

  // The arrival glow fades off as you stand up from the laptop.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setArriving(false));
    const timer = window.setTimeout(() => setIntroDone(true), 1300);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  // Full-bleed scene: stop the document scrolling, and stop mobile pull-to-refresh
  // and rubber-banding fighting the drag-to-look gesture.
  useEffect(() => {
    const { overflow, overscrollBehavior } = document.body.style;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.overscrollBehavior = overscrollBehavior;
    };
  }, []);

  const setWalking = (value: boolean) => {
    walking.current = value;
    setPressed(value);
  };

  return (
    <>
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--background)",
        overflow: "hidden",
        overscrollBehavior: "none",
      }}
    >
      <Suspense
        fallback={
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "rgb(var(--color-muted))",
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Loading room…
          </div>
        }
      >
        <ExploreScene
          theme={theme}
          handle={handle}
          onSelect={handleSelect}
          onMove={dismissHint}
          quality={isMobile ? "mobile" : "desktop"}
        />
      </Suspense>

      {/* Top overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding:
            "calc(14px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) 0 calc(14px + env(safe-area-inset-left))",
          pointerEvents: photosOpen ? "none" : "auto",
          opacity: photosOpen ? 0 : 1,
          transition: "opacity 200ms ease",
        }}
      >
        <Link to="/" style={{ ...overlayButton, pointerEvents: "auto" }}>
          <ArrowLeft style={{ height: 15, width: 15 }} />
          Back
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setCreditsOpen(true)}
            style={{ ...overlayButton, pointerEvents: "auto" }}
            aria-label="Model credits"
          >
            <Info style={{ height: 15, width: 15 }} />
            <span className="hidden-mobile">Credits</span>
          </button>
          <button
            type="button"
            onClick={() => recentre.current?.()}
            style={{ ...overlayButton, pointerEvents: "auto" }}
            aria-label="Return to the entrance"
          >
            <Compass style={{ height: 15, width: 15 }} />
            <span className="hidden-mobile">Recentre</span>
          </button>
        </div>
      </div>

      {/* Controls hint */}
      <div
        style={{
          position: "absolute",
          top: "42%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(90vw, 420px)",
          textAlign: "center",
          pointerEvents: "none",
          opacity: hintVisible && !leaving && !photosOpen && introDone ? 1 : 0,
          transition: "opacity 500ms ease",
          color: "rgb(var(--color-ink))",
          textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          fontSize: 13,
          lineHeight: 1.9,
          letterSpacing: "0.1em",
        }}
      >
        {isMobile ? (
          <>
            Drag to look around
            <br />
            Tap the floor to walk there
            <br />
            Tap an object to open it
          </>
        ) : (
          <>
            Drag to look around · WASD to walk
            <br />
            Click the floor to walk there
            <br />
            Click an object to open it
          </>
        )}
      </div>

      {/* Hold-to-walk button */}
      <button
        type="button"
        aria-label="Hold to walk forward"
        aria-pressed={pressed}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          dismissHint();
          setWalking(true);
          // a short tick confirms the press on devices that support it
          navigator.vibrate?.(12);
        }}
        onPointerUp={() => setWalking(false)}
        onPointerCancel={() => setWalking(false)}
        onPointerLeave={() => setWalking(false)}
        onLostPointerCapture={() => setWalking(false)}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "absolute",
          bottom:
            (selected && panelIsSheet) || leaving || photosOpen || !introDone
              ? "-120px"
              : "calc(24px + env(safe-area-inset-bottom))",
          left: "50%",
          height: 76,
          width: 76,
          borderRadius: 999,
          border: `1px solid ${pressed ? "rgb(var(--color-ocean))" : "rgb(var(--color-divider))"}`,
          background: pressed ? "rgb(var(--color-ocean) / 0.22)" : "rgb(var(--color-surface) / 0.8)",
          boxShadow: pressed
            ? "0 0 0 8px rgb(var(--color-ocean) / 0.12)"
            : "0 6px 18px rgba(0,0,0,0.22)",
          backdropFilter: "blur(8px)",
          color: "rgb(var(--color-ink))",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTapHighlightColor: "transparent",
          transform: `translateX(-50%) scale(${pressed ? 0.92 : 1})`,
          // the press reads instantly; only the slide-away on open is eased
          transition: "bottom 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 90ms ease-out, background 90ms ease-out, box-shadow 140ms ease-out",
        }}
      >
        <ChevronUp
          style={{
            height: 28,
            width: 28,
            transition: "transform 140ms ease-out",
            transform: pressed ? "translateY(-2px)" : "none",
          }}
        />
      </button>

      <ExplorePanel item={selected} onClose={() => setSelectedId(null)} />
      <ExploreCredits open={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </div>

    {/*
      Transition cover: sits above both the room and the scrapbook overlay
      (whichever is currently underneath), so stepping away from the laptop
      or the pinboard and coming back both read as one continuous move.
      Heading for the laptop it glows like a screen waking up; heading for
      the scrapbook it is a plain dissolve into its own ground, so it fades
      up in place over the room rather than arriving after a flash — and the
      same cover plays in reverse over the scrapbook on the way back.
    */}
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        pointerEvents: "none",
        background:
          (leaving || photosOpen) && exitTo === "photos"
            ? "var(--background)"
            : "radial-gradient(circle at 50% 52%, #f6f4ee 0%, #d9d5cb 45%, #14120d 100%)",
        opacity: leaving || arriving ? 1 : 0,
        transition: leaving ? "opacity 620ms ease-in 180ms" : "opacity 900ms ease-out",
      }}
    />

    {/*
      The scrapbook mounts as a normal, document-scrolling sibling rather
      than inside the fixed/overflow-hidden room container above, so the
      page can actually scroll — it just sits on top of the (still-mounted,
      paused-looking) room, and "Back to room" reverses the same fade
      instead of a route change.
    */}
    {photosOpen && (
      <div style={{ position: "relative", zIndex: 60, minHeight: "100vh", background: "var(--background)" }}>
        <button
          type="button"
          onClick={closePhotos}
          style={{
            ...overlayButton,
            position: "fixed",
            top: "calc(14px + env(safe-area-inset-top))",
            left: "calc(14px + env(safe-area-inset-left))",
            zIndex: 70,
          }}
        >
          <ArrowLeft style={{ height: 15, width: 15 }} />
          Back to room
        </button>
        <PhotoScrapbook />
      </div>
    )}
    </>
  );
}
