import type { CSSProperties } from "react";

import { getTapeStyle } from "@/utils/photoStyle";
import { getCloudinaryPortraitUrl } from "@/utils/cloudinary";

/*
 * A still copy of the prints on the Photos page (components/photos/Polaroid),
 * for teasers elsewhere: the same paper, tape, borders, vignette, warm cast,
 * grain and shadow, with nothing interactive. Borders are percentages of the
 * width so it reads the same at any size. Needs <SharedFilters /> on the page
 * for the paper and film textures.
 */
const PAPER = "linear-gradient(160deg, #ede5ce 0%, #e8ddc4 60%, #e2d6ba 100%)";
const SHADOW = "0 8px 28px rgba(0,0,0,0.65), 0 3px 8px rgba(0,0,0,0.4)";
const VIGNETTE = "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)";

export function PolaroidPrint({
  id,
  width = 320,
  tape = true,
  className = "",
  style,
}: {
  /** Cloudinary public id */
  id: string;
  /** pixel width to request */
  width?: number;
  tape?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const strip = getTapeStyle(id);

  return (
    <span aria-hidden className={`block ${className}`} style={style}>
      {tape && (
        <span
          style={{
            position: "absolute",
            top: "-4%",
            left: `calc(50% + ${strip.offset}%)`,
            width: `${strip.width}%`,
            height: "8%",
            transform: `translateX(-50%) rotate(${strip.rotation}deg)`,
            background: strip.colour,
            clipPath: "polygon(2% 0, 98% 4%, 100% 30%, 97% 55%, 100% 80%, 98% 100%, 1% 96%, 3% 70%, 0 45%, 2% 20%)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            zIndex: 3,
          }}
        />
      )}
      <span
        style={{
          display: "block",
          position: "relative",
          overflow: "hidden",
          background: PAPER,
          // the Photos page's 9px sides and 30px foot, on a print about 230px wide
          padding: "4% 4% 13%",
          borderRadius: 2,
          boxShadow: SHADOW,
          transform: "perspective(500px) rotateX(3.5deg)",
        }}
      >
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.09, zIndex: 1, mixBlendMode: "multiply" }}>
          <rect width="100%" height="100%" filter="url(#shared-paper)" />
        </svg>
        <span style={{ display: "block", position: "relative", overflow: "hidden", borderRadius: 1, background: "#3a3328" }}>
          <img
            src={getCloudinaryPortraitUrl(id, width)}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ display: "block", width: "100%", aspectRatio: "3 / 4", objectFit: "cover" }}
          />
          <span style={{ position: "absolute", inset: 0, background: VIGNETTE }} />
          <span style={{ position: "absolute", inset: 0, background: "rgba(160,100,30,0.06)", mixBlendMode: "multiply" }} />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18, mixBlendMode: "overlay" }}>
            <rect width="100%" height="100%" filter="url(#shared-film)" />
          </svg>
        </span>
      </span>
    </span>
  );
}
