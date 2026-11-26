import { useMemo } from "react";
import type { Photo } from "@/hooks/usePhotos";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDateRange(photos: Photo[]): string {
  const dates = photos
    .map(p => p.metadata.dateTaken)
    .filter(Boolean)
    .sort();
  if (!dates.length) return "";
  const [startYear, startMonth] = dates[0].split("-").map(Number);
  const [endYear, endMonth] = dates[dates.length - 1].split("-").map(Number);
  const startStr = `${MONTHS[startMonth - 1]} ${startYear}`;
  const endStr = `${MONTHS[endMonth - 1]} ${endYear}`;
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}

interface GroupHeaderProps {
  groupName: string;
  photos: Photo[];
  /** Desktop spread: a larger title that sits pinned beside its photos, with the places and photo count. */
  spread?: boolean;
}

export function GroupHeader({ groupName, photos, spread = false }: GroupHeaderProps) {
  const dateRange = useMemo(() => formatDateRange(photos), [photos]);
  const places = useMemo(
    () => Array.from(new Set(photos.map(p => p.metadata.location?.split(",")[0].trim()).filter(Boolean))),
    [photos],
  );

  if (spread) {
    return (
      <div style={{ position: "sticky", top: 104, zIndex: 7 }}>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "11px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgb(var(--color-muted))",
          margin: 0,
        }}>
          {dateRange}
        </p>
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          fontSize: "34px",
          letterSpacing: "-0.02em",
          color: "var(--foreground)",
          margin: "12px 0 0",
          lineHeight: 1.1,
          paddingBottom: 4,
        }}>
          {groupName}
        </h2>
        <div style={{ width: 36, height: 1, background: "rgba(200, 165, 100, 0.55)", margin: "20px 0 16px" }} />
        {places.length > 0 && (
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: "italic",
            fontSize: "15px",
            lineHeight: 1.6,
            color: "var(--foreground)",
            opacity: 0.75,
            margin: 0,
          }}>
            {places.join(" · ")}
          </p>
        )}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "12px",
          color: "rgb(var(--color-muted))",
          margin: "8px 0 0",
        }}>
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      margin: "48px 0 32px",
      position: "relative",
      zIndex: 7,
      paddingLeft: "4%",
    }}>
      <h2 style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 600,
        fontSize: "22px",
        letterSpacing: "-0.01em",
        color: "var(--foreground)",
        margin: 0,
        lineHeight: 1.25,
        paddingBottom: 2,
      }}>
        {groupName}
      </h2>
      {dateRange && (
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: "rgb(var(--color-muted))",
          margin: "6px 0 0",
          letterSpacing: "0.02em",
        }}>
          {dateRange}
        </p>
      )}
    </div>
  );
}
