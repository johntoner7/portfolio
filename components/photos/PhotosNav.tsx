import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { siteData } from "@/lib/data";

export function PhotosNav() {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      // Fade from fully visible at 0 to nearly invisible at 200px
      const ratio = Math.min(window.scrollY / 200, 1);
      setOpacity(1 - ratio * 0.75);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "clamp(320px, 98vw, 760px)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 20,
        opacity,
        transition: "opacity 0.1s linear",
        pointerEvents: opacity < 0.15 ? "none" : "auto",
      }}
    >
      <Link
        to="/"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: "14px",
          letterSpacing: "0.06em",
          color: "rgba(255,255,255,0.7)",
          textDecoration: "none",
        }}
      >
        {siteData.identity.name}
      </Link>

      <Link
        to="/"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontWeight: 400,
          fontSize: "12px",
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.45)",
          textDecoration: "none",
        }}
      >
        ← back
      </Link>
    </header>
  );
}
