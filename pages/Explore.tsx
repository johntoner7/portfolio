import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronUp,
  Compass,
  Download,
  Eraser,
  Info,
  Pencil,
  RotateCw,
  Send,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useBelfastWeather } from "@/hooks/useBelfastWeather";
import { exploreItems } from "@/components/explore/exploreItems";
import { ExplorePanel } from "@/components/explore/ExplorePanel";
import { ExploreCredits } from "@/components/explore/ExploreCredits";
import { PhotoScrapbook } from "@/components/photos/PhotoScrapbook";
import type { PlayerHandle } from "@/components/explore/ExploreScene";
import {
  BOARD_INKS,
  BOARD_NIBS,
  BOARD_NOTE_COLOURS,
  DEFAULT_TOOL,
  NOTE_MAX_CHARS,
  type BoardMode,
  type BoardTool,
} from "@/components/explore/boardTools";

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

/** A floating group of whiteboard controls. */
const toolRail: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgb(var(--color-divider))",
  background: "rgb(var(--color-surface) / 0.88)",
  backdropFilter: "blur(10px)",
};

const railDivider: React.CSSProperties = {
  width: 1,
  height: 22,
  background: "rgb(var(--color-divider))",
};

/** Shorter than `overlayButton` — several of these share one row. */
const compactButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  touchAction: "manipulation",
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid rgb(var(--color-divider))",
  background: "rgb(var(--color-surface) / 0.9)",
  color: "rgb(var(--color-ink))",
  fontSize: 13,
  cursor: "pointer",
};

const toolChip = (active: boolean, touch = false): React.CSSProperties => ({
  display: "inline-grid",
  placeItems: "center",
  // 44px is the thumb-sized target the rest of the room's controls use
  height: touch ? 44 : 34,
  width: touch ? 44 : 34,
  touchAction: "manipulation",
  borderRadius: 999,
  cursor: "pointer",
  color: "rgb(var(--color-ink))",
  border: active ? "1px solid rgb(var(--color-ink))" : "1px solid transparent",
  background: active ? "rgb(var(--color-ink) / 0.10)" : "transparent",
});

const sendField: React.CSSProperties = {
  height: 38,
  padding: "0 10px",
  borderRadius: 10,
  border: "1px solid rgb(var(--color-divider))",
  background: "rgb(var(--color-surface))",
  color: "rgb(var(--color-ink))",
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
  // the container turns selection off wholesale; typed text needs it back
  userSelect: "text",
  WebkitUserSelect: "text",
};

export function Explore() {
  const theme = useThemeMode();
  const isMobile = useIsMobile();
  // the window looks out on the real Belfast; null until it lands, and on failure
  const weather = useBelfastWeather();
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
  const standAtBoard = useRef<((done: () => void) => void) | null>(null);
  const leaveBoard = useRef<(() => void) | null>(null);
  const clearBoard = useRef<(() => void) | null>(null);
  const boardImage = useRef<(() => string | null) | null>(null);
  const setBoardTool = useRef<((tool: BoardTool) => void) | null>(null);
  const setNoteText = useRef<((text: string) => void) | null>(null);
  const deselectNote = useRef<(() => void) | null>(null);
  const deleteNote = useRef<(() => void) | null>(null);
  const handle: PlayerHandle = useMemo(
    () => ({
      walking,
      recentre,
      sitDown,
      standAtBoard,
      leaveBoard,
      clearBoard,
      boardImage,
      setBoardTool,
      setNoteText,
      deselectNote,
      deleteNote,
    }),
    [],
  );
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
  // docked at the whiteboard, drawing on it
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [tool, setTool] = useState<BoardTool>(DEFAULT_TOOL);
  // null when no sticky note is selected; otherwise that note's text
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const noteField = useRef<HTMLTextAreaElement>(null);
  // how much of the viewport the on-screen keyboard is covering
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const [rotateHintDismissed, setRotateHintDismissed] = useState(false);
  /*
   * `useIsMobile` is a width test, so a phone turned sideways (844px) reads
   * as desktop. Touch sizing has to follow the input device, and the toolbar
   * layout has to follow the height that is actually left.
   */
  const [isTouch, setIsTouch] = useState(false);
  const [isShort, setIsShort] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const short = window.matchMedia("(max-height: 539px)");
    const measure = () => {
      setIsTouch(coarse.matches);
      setIsShort(short.matches);
    };
    measure();
    coarse.addEventListener("change", measure);
    short.addEventListener("change", measure);
    return () => {
      coarse.removeEventListener("change", measure);
      short.removeEventListener("change", measure);
    };
  }, []);

  /*
   * A 2.06 x 1.11 board is width-bound in portrait, so it can only ever be a
   * quarter of a tall screen. Turned sideways it becomes height-bound and
   * fills most of the viewport. iOS Safari cannot be told to rotate, so this
   * is a nudge rather than a lock — drawing stays available either way.
   */
  useEffect(() => {
    const portrait = window.matchMedia("(orientation: portrait)");
    const measure = () => setIsPortrait(portrait.matches);
    measure();
    portrait.addEventListener("change", measure);
    return () => portrait.removeEventListener("change", measure);
  }, []);

  const showRotateHint = drawingOpen && isMobile && isPortrait && !rotateHintDismissed;

  /*
   * The toolbar is pinned to the bottom of a fixed container, which the
   * on-screen keyboard does not move — so on a phone the note field would
   * open underneath it. visualViewport is the only thing that reports the
   * covered height; without it (older browsers) the inset stays 0 and the
   * toolbar sits where it always did.
   */
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const measure = () =>
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    measure();
    viewport.addEventListener("resize", measure);
    viewport.addEventListener("scroll", measure);
    return () => {
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
    };
  }, []);
  // Send opens a small form first, so the drawing only ever leaves the
  // browser on a second, deliberate press.
  const [sendOpen, setSendOpen] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderNote, setSenderNote] = useState("");

  // the scene reads these mid-stroke, so push every change straight through
  useEffect(() => {
    setBoardTool.current?.(tool);
  }, [tool]);

  const pickTool = useCallback((patch: Partial<BoardTool>) => {
    setTool((current) => {
      // leaving note mode drops the selection, so the editor closes with it
      if (patch.mode && patch.mode !== "note" && current.mode === "note") {
        deselectNote.current?.();
        setNoteDraft(null);
      }
      return { ...current, ...patch };
    });
  }, []);

  /** The scene reports which note was just tapped, so the field can open. */
  const handleNoteSelect = useCallback((text: string | null) => {
    setNoteDraft(text);
    if (text !== null) {
      // focus without scrolling the fixed room container around
      window.requestAnimationFrame(() => noteField.current?.focus({ preventScroll: true }));
    }
  }, []);

  const selected = useMemo(
    () => exploreItems.find((item) => item.id === selectedId) ?? null,
    [selectedId],
  );

  const dismissHint = useCallback(() => setHintVisible(false), []);
  // a fresh mark re-arms Send, so a redraw after sending can be sent again
  const markDrawn = useCallback(() => {
    setHasDrawing(true);
    setSendStatus("idle");
  }, []);
  const handleSelect = useCallback(
    (id: string) => {
      setHintVisible(false);
      /*
       * The whiteboard is a bespoke prop rather than a data-driven exhibit,
       * so it has no exploreItems entry — the camera docks square-on to it
       * and the pointer becomes a marker until you're done. The pan itself
       * is the transition; no fade cover, the same as Recentre.
       */
      if (id === "whiteboard") {
        walking.current = false;
        setPressed(false);
        setHasDrawing(false);
        setSendStatus("idle");
        standAtBoard.current?.(() => setDrawingOpen(true));
        return;
      }
      /*
       * The wall switch works the room's lights, which is the site's own
       * light/dark theme. Setting the class is enough on its own —
       * `useThemeMode` watches it — and localStorage is what makes the
       * choice stick across pages, matching the nav's toggle.
       */
      if (id === "lightswitch") {
        const next = theme === "dark" ? "light" : "dark";
        document.documentElement.classList.toggle("light", next === "light");
        window.localStorage.setItem("theme", next);
        return;
      }
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
    [navigate, theme],
  );

  const leaveDrawing = useCallback(() => {
    leaveBoard.current?.();
    setDrawingOpen(false);
    setHasDrawing(false);
    setSendStatus("idle");
    setSendOpen(false);
    setSenderName("");
    setSenderNote("");
    setNoteDraft(null);
  }, []);

  /** Explicit opt-in: the board is only ever sent by confirming this form. */
  const sendDrawing = useCallback(async () => {
    const image = boardImage.current?.();
    if (!image) return;
    setSendStatus("sending");
    try {
      const res = await fetch("/api/send-whiteboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, name: senderName, message: senderNote }),
      });
      setSendStatus(res.ok ? "sent" : "error");
      if (res.ok) setSendOpen(false);
    } catch {
      setSendStatus("error");
    }
  }, [senderName, senderNote]);

  /** Takes the drawing away without sending it anywhere. */
  const downloadDrawing = useCallback(() => {
    const image = boardImage.current?.();
    if (!image) return;
    const link = document.createElement("a");
    link.href = image;
    link.download = "whiteboard.png";
    link.click();
  }, []);

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

  // thumb-sized controls and the fields' own selection rules, both of which
  // only matter once the whiteboard toolbar is on screen
  const actionStyle: React.CSSProperties = {
    ...compactButton,
    height: isTouch ? 44 : 36,
    padding: "0 12px",
  };
  const fieldStyle: React.CSSProperties = { ...sendField, height: isTouch ? 44 : 38 };
  /*
   * Sideways on a phone the board is framed to fill the height, so the
   * controls get one short icon-only row along the bottom rather than two
   * stacked rails — every extra row comes straight off the board.
   */
  const oneRow = isShort;
  const iconOnly = isTouch || oneRow;
  /** which tool groups the current mode can actually use */
  const showColours = tool.mode !== "eraser";
  const showNibs = tool.mode !== "note";

  const actionButtons = (
    <>
          <button
            type="button"
            aria-label="Clear the board"
            onClick={() => {
              clearBoard.current?.();
              setNoteDraft(null);
            }}
            style={actionStyle}
          >
            <Trash2 style={{ height: 15, width: 15 }} />
            {!iconOnly && "Clear"}
          </button>
          <button
            type="button"
            aria-label="Download the drawing"
            onClick={downloadDrawing}
            disabled={!hasDrawing}
            style={{ ...actionStyle, opacity: hasDrawing ? 1 : 0.45 }}
          >
            <Download style={{ height: 15, width: 15 }} />
            {!iconOnly && "Download"}
          </button>
          <button
            type="button"
            aria-label="Send the drawing to John"
            onClick={() => {
              // the note editor and the send form share the same space
              deselectNote.current?.();
              setNoteDraft(null);
              setSendOpen((open) => !open);
            }}
            disabled={!hasDrawing}
            style={{
              ...actionStyle,
              opacity: hasDrawing ? 1 : 0.45,
              borderColor:
                sendStatus === "error" ? "rgb(var(--color-clay))" : "rgb(var(--color-divider))",
            }}
          >
            <Send style={{ height: 15, width: 15 }} />
            {sendStatus === "sent" && !iconOnly ? "Sent — thank you" : iconOnly ? "" : "Send to John"}
          </button>
          <button type="button" aria-label="Done" onClick={leaveDrawing} style={actionStyle}>
            <Check style={{ height: 15, width: 15 }} />
            {!iconOnly && "Done"}
          </button>
    </>
  );

  const overlaysHidden = photosOpen || drawingOpen;
  const overlayHits: React.CSSProperties["pointerEvents"] = overlaysHidden ? "none" : "auto";

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
        // the room is a scene to drag around, not a document to select;
        // the text fields opt back in individually
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
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
          onDrawStart={markDrawn}
          onNoteSelect={handleNoteSelect}
          quality={isMobile ? "mobile" : "desktop"}
          weather={weather}
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
          // the children set pointerEvents themselves, so hiding the strip has
          // to reach them too or a faded-out Back link stays clickable
          pointerEvents: overlaysHidden ? "none" : "auto",
          opacity: overlaysHidden ? 0 : 1,
          transition: "opacity 200ms ease",
        }}
      >
        <Link to="/" style={{ ...overlayButton, pointerEvents: overlayHits }}>
          <ArrowLeft style={{ height: 15, width: 15 }} />
          Back
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setCreditsOpen(true)}
            style={{ ...overlayButton, pointerEvents: overlayHits }}
            aria-label="Model credits"
          >
            <Info style={{ height: 15, width: 15 }} />
            <span className="hidden-mobile">Credits</span>
          </button>
          <button
            type="button"
            onClick={() => recentre.current?.()}
            style={{ ...overlayButton, pointerEvents: overlayHits }}
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
          opacity: hintVisible && !leaving && !overlaysHidden && introDone ? 1 : 0,
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
            (selected && panelIsSheet) || leaving || overlaysHidden || !introDone
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

      {/*
        Whiteboard toolbar — only while docked. Everything stacks in one
        flow column (send form, note editor, tools, actions) so a row that
        wraps on a narrow phone pushes the rest up instead of overlapping
        it, which a fixed offset could not do.
      */}
      <div
        style={{
          position: "absolute",
          bottom: drawingOpen
            ? `calc(16px + env(safe-area-inset-bottom) + ${keyboardInset}px)`
            : "-420px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          width: "calc(100vw - 20px)",
          maxWidth: 620,
          transition: "bottom 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {showRotateHint && (
          <div
            style={{
              ...toolRail,
              gap: 10,
              padding: "8px 10px 8px 14px",
              fontSize: 13,
              color: "rgb(var(--color-ink))",
            }}
          >
            <RotateCw style={{ height: 16, width: 16, flexShrink: 0 }} />
            <span>Turn your phone sideways for a much bigger board</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setRotateHintDismissed(true)}
              style={{
                ...toolChip(false, false),
                height: 30,
                width: 30,
                flexShrink: 0,
                color: "rgb(var(--color-muted))",
              }}
            >
              <X style={{ height: 14, width: 14 }} />
            </button>
          </div>
        )}

        {/* Send form: the second, deliberate press that actually sends */}
        {sendOpen && (
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 14,
              borderRadius: 16,
              border: "1px solid rgb(var(--color-divider))",
              background: "rgb(var(--color-surface) / 0.94)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "rgb(var(--color-muted))", lineHeight: 1.5 }}>
              This emails the board to John as a PNG. Both fields are optional.
            </p>
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              style={fieldStyle}
            />
            <textarea
              value={senderNote}
              onChange={(e) => setSenderNote(e.target.value)}
              placeholder="A note to go with it"
              maxLength={600}
              rows={3}
              style={{ ...fieldStyle, resize: "vertical", paddingTop: 10, height: "auto" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setSendOpen(false)} style={actionStyle}>
                Cancel
              </button>
              <button
                type="button"
                onClick={sendDrawing}
                disabled={sendStatus === "sending"}
                style={{
                  ...actionStyle,
                  background: "rgb(var(--color-ink))",
                  color: "rgb(var(--color-surface))",
                  borderColor: "rgb(var(--color-ink))",
                }}
              >
                {sendStatus === "sending" ? "Sending…" : "Send it"}
              </button>
            </div>
            {sendStatus === "error" && (
              <p style={{ margin: 0, fontSize: 12, color: "rgb(var(--color-clay))" }}>
                That didn't send. Have another go in a moment.
              </p>
            )}
          </div>
        )}

        {/* Note editor — appears against the note you just tapped */}
        {noteDraft !== null && (
          <div
            style={{
              ...toolRail,
              borderRadius: 14,
              gap: 8,
              width: "100%",
              maxWidth: 340,
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={noteField}
              value={noteDraft}
              onChange={(e) => {
                setNoteDraft(e.target.value);
                setNoteText.current?.(e.target.value);
              }}
              placeholder="Write on the note…"
              maxLength={NOTE_MAX_CHARS}
              rows={2}
              aria-label="Sticky note text"
              style={{
                ...fieldStyle,
                height: "auto",
                paddingTop: 8,
                paddingBottom: 8,
                resize: "none",
                lineHeight: 1.4,
              }}
            />
            <button
              type="button"
              aria-label="Remove this note"
              onClick={() => {
                deleteNote.current?.();
                setNoteDraft(null);
              }}
              style={{ ...actionStyle, flexShrink: 0, padding: "0 10px" }}
            >
              <Trash2 style={{ height: 15, width: 15 }} />
            </button>
            <button
              type="button"
              onClick={() => {
                deselectNote.current?.();
                setNoteDraft(null);
              }}
              style={{ ...actionStyle, flexShrink: 0 }}
            >
              Done
            </button>
          </div>
        )}

        {/* Tools: what the marker does, then what colour, then how thick */}
        <div style={{ ...toolRail, flexWrap: "wrap", justifyContent: "center" }}>
          {([
            ["pen", Pencil, "Pen"],
            ["eraser", Eraser, "Eraser"],
            ["note", StickyNote, "Sticky note"],
          ] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              aria-label={label}
              aria-pressed={tool.mode === mode}
              onClick={() => pickTool({ mode: mode as BoardMode })}
              style={toolChip(tool.mode === mode, isTouch)}
            >
              <Icon style={{ height: 16, width: 16 }} />
            </button>
          ))}

          {/*
            On a phone the rail is the scarcest space in the room, so a group
            the current tool cannot use is dropped rather than dimmed. On
            desktop it stays dimmed, where holding the width steady is worth
            more than the room it costs.
          */}
          {(showColours || !iconOnly) && (
            <>
              <span style={railDivider} />
              {(tool.mode === "note" ? BOARD_NOTE_COLOURS : BOARD_INKS).map((colour) => {
                const active =
                  tool.mode === "note" ? tool.noteColour === colour : tool.colour === colour;
                return (
                  <button
                    key={colour}
                    type="button"
                    aria-label={`Colour ${colour}`}
                    aria-pressed={active}
                    onClick={() =>
                      pickTool(tool.mode === "note" ? { noteColour: colour } : { colour })
                    }
                    style={{
                      // a thumb needs more than the swatch itself, so the
                      // button is padded out around a smaller dot
                      height: isTouch ? 40 : 26,
                      width: isTouch ? 40 : 26,
                      padding: 0,
                      borderRadius: 999,
                      background: colour,
                      cursor: "pointer",
                      opacity: showColours ? 1 : 0.35,
                      border: active
                        ? "2px solid rgb(var(--color-ink))"
                        : "1px solid rgb(var(--color-divider))",
                      boxShadow: active ? "0 0 0 3px rgb(var(--color-ink) / 0.12)" : "none",
                    }}
                  />
                );
              })}
            </>
          )}

          {(showNibs || !iconOnly) && (
            <>
              <span style={railDivider} />
              {BOARD_NIBS.map((width) => (
                <button
                  key={width}
                  type="button"
                  aria-label={`Nib ${width}`}
                  aria-pressed={tool.width === width}
                  onClick={() => pickTool({ width })}
                  disabled={!showNibs}
                  style={{
                    ...toolChip(tool.width === width, isTouch),
                    opacity: showNibs ? 1 : 0.35,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      borderRadius: 999,
                      background: "rgb(var(--color-ink))",
                      // the swatch reads as the nib it selects, scaled to fit
                      height: Math.max(3, width * 0.55),
                      width: Math.max(3, width * 0.55),
                    }}
                  />
                </button>
              ))}
            </>
          )}
          {oneRow && <span style={railDivider} />}
          {oneRow && actionButtons}
        </div>

        {/* Actions. Sideways on a phone they join the row above instead. */}
        {!oneRow && (
          <div style={{ ...toolRail, flexWrap: "wrap", justifyContent: "center" }}>
            {actionButtons}
          </div>
        )}
      </div>

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
