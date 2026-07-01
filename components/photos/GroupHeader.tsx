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
}

export function GroupHeader({ groupName, photos }: GroupHeaderProps) {
  const dateRange = useMemo(() => formatDateRange(photos), [photos]);

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
