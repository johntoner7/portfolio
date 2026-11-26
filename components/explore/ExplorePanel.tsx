"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { ExploreItem } from "./exploreItems";

/** the small uppercase rule that separates one part of the panel from the next */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgb(var(--color-muted))",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: "rgb(var(--color-divider))" }} />
    </div>
  );
}

export function ExplorePanel({ item, onClose }: { item: ExploreItem | null; onClose: () => void }) {
  const [openChip, setOpenChip] = useState<string | null>(null);
  /*
   * The panel slides out rather than vanishing, so it has to keep rendering
   * the last item until the transition has finished — otherwise the content
   * blanks out while the card is still on screen.
   */
  const [shown, setShown] = useState<ExploreItem | null>(item);

  useEffect(() => {
    if (item) {
      setShown(item);
      return;
    }
    const timer = window.setTimeout(() => setShown(null), 340);
    return () => window.clearTimeout(timer);
  }, [item]);

  // a different object means a different set of chips
  useEffect(() => {
    setOpenChip(null);
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  const open = Boolean(item);
  const accent = shown?.accent ?? "#84a83c";

  const note = openChip ? shown?.chipNotes?.[openChip] : null;

  /** the expanded blurb for whichever chip is open, shown under its own group */
  const noteBlock = note ? (
    <div
      style={{
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid rgb(var(--color-divider))",
        borderLeft: `3px solid ${accent}`,
        background: "rgb(var(--color-page) / 0.6)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {openChip}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.65, color: "rgb(var(--color-muted))" }}>
        {note}
      </p>
    </div>
  ) : null;

  const renderChip = (chip: string) => {
    const hasNote = Boolean(shown?.chipNotes?.[chip]);
    const active = openChip === chip;
    const chipStyle: CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      letterSpacing: "0.02em",
      padding: hasNote ? "6px 9px 6px 12px" : "6px 12px",
      borderRadius: 999,
      border: `1px solid ${active ? accent : "rgb(var(--color-divider))"}`,
      background: active ? `${accent}26` : "rgb(var(--color-page) / 0.5)",
      color: active ? "rgb(var(--color-ink))" : "rgb(var(--color-muted))",
      fontFamily: "inherit",
      transition: "border-color 140ms ease, background 140ms ease, color 140ms ease",
    };

    // chips with a note behind them are buttons; the rest stay labels
    return hasNote ? (
      <button
        key={chip}
        type="button"
        onClick={() => setOpenChip(active ? null : chip)}
        aria-expanded={active}
        style={{ ...chipStyle, cursor: "pointer", touchAction: "manipulation" }}
      >
        {chip}
        <ChevronDown
          style={{
            height: 12,
            width: 12,
            opacity: 0.7,
            transition: "transform 160ms ease",
            transform: active ? "rotate(180deg)" : "none",
          }}
        />
      </button>
    ) : (
      <span key={chip} style={chipStyle}>
        {chip}
      </span>
    );
  };

  return (
    <aside aria-hidden={!open} data-open={open} className="explore-panel">
      <div className="explore-panel-card">
        {/* accent signature: a hairline of the object's own colour, softened below */}
        <div aria-hidden style={{ height: 3, background: accent, flexShrink: 0 }} />
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 3,
            left: 0,
            right: 0,
            height: 140,
            background: `linear-gradient(180deg, ${accent}24, transparent)`,
            pointerEvents: "none",
          }}
        />

        <header
          style={{
            position: "relative",
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "16px 20px 14px",
          }}
        >
          <div
            aria-hidden
            className="explore-panel-grabber"
            style={{
              position: "absolute",
              top: 7,
              left: "50%",
              transform: "translateX(-50%)",
              width: 36,
              height: 4,
              borderRadius: 999,
              background: "rgb(var(--color-divider))",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              {shown?.label}
            </p>
            <h2
              style={{
                margin: "7px 0 0",
                fontFamily: "var(--font-syne), sans-serif",
                fontSize: 24,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                color: "rgb(var(--color-ink))",
              }}
            >
              {shown?.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: "inline-flex",
              height: 38,
              width: 38,
              touchAction: "manipulation",
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: "1px solid rgb(var(--color-divider))",
              background: "rgb(var(--color-page) / 0.6)",
              color: "rgb(var(--color-muted))",
              cursor: "pointer",
            }}
          >
            <X style={{ height: 16, width: 16 }} />
          </button>
        </header>

        <div className="explore-panel-scroll">
          <div style={{ padding: "0 20px calc(24px + env(safe-area-inset-bottom))" }}>
            {shown?.hook && (
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: "rgb(var(--color-ink))",
                }}
              >
                {shown.hook}
              </p>
            )}

            {shown?.feature && (
              <div
                style={{
                  marginTop: shown.hook ? 16 : 0,
                  padding: "18px 18px 16px",
                  borderRadius: 14,
                  border: "1px solid rgb(var(--color-divider))",
                  borderTop: `3px solid ${accent}`,
                  background: "rgb(var(--color-page) / 0.6)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: accent,
                  }}
                >
                  {shown.feature.kicker}
                </p>
                <p
                  lang="es"
                  style={{
                    margin: "10px 0 0",
                    fontFamily: "var(--font-syne), sans-serif",
                    fontSize: 28,
                    lineHeight: 1.15,
                    color: "rgb(var(--color-ink))",
                  }}
                >
                  {shown.feature.big}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, color: "rgb(var(--color-muted))" }}>
                  {shown.feature.small}
                </p>
              </div>
            )}

            {shown?.stats && shown.stats.length > 0 && (
              <div
                style={{
                  marginTop: shown.hook || shown.feature ? 16 : 0,
                  display: "grid",
                  gridTemplateColumns: `repeat(${shown.stats.length}, minmax(0, 1fr))`,
                  gap: 8,
                }}
              >
                {shown.stats.map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      minWidth: 0,
                      padding: "12px 12px 10px",
                      borderRadius: 12,
                      border: "1px solid rgb(var(--color-divider))",
                      background: "rgb(var(--color-page) / 0.5)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-syne), sans-serif",
                        fontSize: 19,
                        lineHeight: 1.1,
                        color: "rgb(var(--color-ink))",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {stat.value}
                    </p>
                    <p style={{ margin: "5px 0 0", fontSize: 11, lineHeight: 1.35, color: "rgb(var(--color-muted))" }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {shown?.body.map((paragraph, i) => (
              <p
                key={i}
                style={{
                  margin: i === 0 && !shown.hook && !shown.feature && !shown.stats ? 0 : i === 0 ? "16px 0 0" : "12px 0 0",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "rgb(var(--color-muted))",
                }}
              >
                {paragraph}
              </p>
            ))}

            {shown?.covers && shown.covers.covers.length > 0 && (
              <section style={{ marginTop: 22 }}>
                <SectionLabel>{shown.covers.title}</SectionLabel>
                <ol
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {shown.covers.covers.map((cover, i) => (
                    <li key={`${cover.title}-${i}`} style={{ minWidth: 0 }}>
                      {cover.src ? (
                        <img
                          src={cover.src}
                          alt=""
                          loading="lazy"
                          width={300}
                          height={300}
                          style={{
                            display: "block",
                            width: "100%",
                            height: "auto",
                            aspectRatio: "1",
                            borderRadius: 6,
                            background: "rgb(var(--color-divider))",
                          }}
                        />
                      ) : (
                        <div
                          aria-hidden
                          style={{ aspectRatio: "1", borderRadius: 6, background: "rgb(var(--color-divider))" }}
                        />
                      )}
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 12,
                          lineHeight: 1.3,
                          color: "rgb(var(--color-ink))",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={cover.title}
                      >
                        {cover.title}
                      </p>
                      <p
                        style={{
                          margin: "1px 0 0",
                          fontSize: 11,
                          lineHeight: 1.3,
                          color: "rgb(var(--color-muted))",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cover.sub}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {shown?.lists?.map((list) => (
              <section key={list.title} style={{ marginTop: 22 }}>
                <SectionLabel>{list.title}</SectionLabel>
                <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {list.rows.map((row, i) => (
                    <li
                      key={`${row.primary}-${i}`}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "8px 0",
                        borderTop: i === 0 ? "none" : "1px solid rgb(var(--color-divider))",
                      }}
                    >
                      <span style={{ minWidth: 0, fontSize: 14, lineHeight: 1.4, color: "rgb(var(--color-ink))" }}>
                        {row.primary}
                      </span>
                      {row.secondary && (
                        <span
                          style={{
                            flexShrink: 1,
                            minWidth: 0,
                            textAlign: "right",
                            fontSize: 12,
                            lineHeight: 1.4,
                            color: "rgb(var(--color-muted))",
                          }}
                        >
                          {row.secondary}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            {/* grouped chips carry their own headings; a short stack does not */}
            {shown?.chipGroups && shown.chipGroups.length > 0
              ? shown.chipGroups.map((group) => (
                  <section key={group.title} style={{ marginTop: 22 }}>
                    <SectionLabel>{group.title}</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {group.items.map(renderChip)}
                    </div>
                    {openChip && group.items.includes(openChip) ? noteBlock : null}
                  </section>
                ))
              : shown?.chips &&
                shown.chips.length > 0 && (
                  <section style={{ marginTop: 22 }}>
                    <SectionLabel>Built with</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {shown.chips.map(renderChip)}
                    </div>
                    {noteBlock}
                  </section>
                )}

            {shown?.links && shown.links.length > 0 && (
              <section style={{ marginTop: 22 }}>
                <SectionLabel>Links</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {shown.links.map((link, i) => {
                    // the first link is the one worth taking; the rest support it
                    const primary = i === 0;
                    const style: CSSProperties = {
                      fontSize: 13,
                      fontWeight: 500,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      minHeight: 42,
                      padding: "9px 16px",
                      touchAction: "manipulation",
                      borderRadius: 999,
                      border: `1px solid ${primary ? accent : "rgb(var(--color-divider))"}`,
                      background: primary ? accent : "transparent",
                      color: primary ? "#14120d" : "rgb(var(--color-ink))",
                      textDecoration: "none",
                    };
                    const internal = link.href.startsWith("/");
                    return internal ? (
                      <Link key={link.href} to={link.href} style={style}>
                        {link.label}
                      </Link>
                    ) : (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer" style={style}>
                        {link.label}
                        {!link.href.startsWith("mailto:") && (
                          <ArrowUpRight style={{ height: 14, width: 14, opacity: 0.8 }} />
                        )}
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {shown?.footnote && (
              <p style={{ margin: "22px 0 0", fontSize: 12, lineHeight: 1.6, color: "rgb(var(--color-muted))" }}>
                {shown.footnote}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
