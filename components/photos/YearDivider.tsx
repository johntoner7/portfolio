export function YearDivider({ year }: { year: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "52px 0 36px", position: "relative", zIndex: 7 }}>
      <div style={{ flex: 1, height: "1px", background: "rgb(var(--color-divider))" }} />
      <span style={{
        fontFamily: "'Lora', Georgia, serif",
        fontWeight: 400,
        fontStyle: "italic",
        fontSize: "13px",
        letterSpacing: "0.08em",
        color: "var(--foreground)",
        opacity: 0.7,
      }}>
        {year}
      </span>
      <div style={{ flex: 1, height: "1px", background: "rgb(var(--color-divider))" }} />
    </div>
  );
}
