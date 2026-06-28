import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { siteData } from "@/lib/data";

export function PhotosNav() {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      const ratio = Math.min(window.scrollY / 300, 1);
      setOpacity(1 - ratio * 0.6);
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
        transition: "opacity 0.15s linear",
        pointerEvents: opacity < 0.15 ? "none" : "auto",
      }}
    >
      <Link
        to="/"
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 500,
          fontSize: "14px",
          letterSpacing: "0.04em",
          color: "rgba(255,255,255,0.9)",
          textDecoration: "none",
        }}
      >
        {siteData.identity.name}
      </Link>

      <Link
        to="/"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: "13px",
          letterSpacing: "0.02em",
          color: "rgba(255,255,255,0.65)",
          textDecoration: "none",
        }}
      >
        ← back
      </Link>
    </header>
  );
}
