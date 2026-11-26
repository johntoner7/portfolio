export function YearDivider({ year, large = false }: { year: number; large?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: large ? "24px" : "14px", margin: large ? "72px 0 56px" : "52px 0 36px", position: "relative", zIndex: 7 }}>
      <div style={{ flex: 1, height: "1px", background: "rgb(var(--color-divider))" }} />
      <span style={{
        fontFamily: "'Lora', Georgia, serif",
        fontWeight: 400,
        fontStyle: "italic",
        fontSize: large ? "28px" : "13px",
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
