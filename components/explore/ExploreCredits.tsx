"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { MODEL_CREDITS } from "./models";

/**
 * CC-BY assets have to be credited somewhere the viewer can reach, so this is
 * a real requirement rather than a nicety. Rendered from MODEL_CREDITS, which
 * is generated alongside the downloads.
 */
export function ExploreCredits({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Model credits"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "rgb(var(--color-page) / 0.75)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "min(80vh, 80dvh)",
          overflowY: "auto",
          overscrollBehavior: "contain",
          borderRadius: 18,
          border: "1px solid rgb(var(--color-divider))",
          background: "rgb(var(--color-surface) / 0.98)",
          padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgb(var(--color-ocean))",
              }}
            >
              Credits
            </p>
            <h2
              style={{
                margin: "4px 0 0",
                fontFamily: "var(--font-syne), sans-serif",
                fontSize: 18,
                color: "rgb(var(--color-ink))",
              }}
            >
              3D models
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: "inline-flex",
              height: 40,
              width: 40,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: "1px solid rgb(var(--color-divider))",
              background: "transparent",
              color: "rgb(var(--color-ink))",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            <X style={{ height: 16, width: 16 }} />
          </button>
        </div>

        <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.6, color: "rgb(var(--color-muted))" }}>
          Models from{" "}
          <a href="https://poly.pizza" target="_blank" rel="noreferrer" style={{ color: "rgb(var(--color-ink))" }}>
            Poly Pizza
          </a>
          . Everything else in the room is built in code.
        </p>

        <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {MODEL_CREDITS.map((credit) => (
            <li
              key={credit.file}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: "2px 8px",
                paddingBottom: 10,
                borderBottom: "1px solid rgb(var(--color-divider) / 0.6)",
                fontSize: 13,
                color: "rgb(var(--color-muted))",
              }}
            >
              <a
                href={credit.source}
                target="_blank"
                rel="noreferrer"
                style={{ color: "rgb(var(--color-ink))", fontWeight: 500 }}
              >
                {credit.title}
              </a>
              <span>by {credit.creator}</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid rgb(var(--color-divider))",
                  whiteSpace: "nowrap",
                }}
              >
                {credit.licence}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
