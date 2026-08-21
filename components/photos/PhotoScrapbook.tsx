import { useEffect } from "react";
import { usePhotos } from "@/hooks/usePhotos";
import { useIsMobile } from "@/hooks/useIsMobile";
import { TableBackground } from "@/components/photos/TableBackground";
import { YearDivider } from "@/components/photos/YearDivider";
import { GroupHeader } from "@/components/photos/GroupHeader";
import { PhotoGroup } from "@/components/photos/PhotoGroup";
import { TableObject } from "@/components/photos/TableObject";
import { ScrollProgress } from "@/components/photos/ScrollProgress";
import { BackToTop } from "@/components/photos/BackToTop";
import { SharedFilters } from "@/components/photos/SharedFilters";
import { getCloudinaryUrl } from "@/utils/cloudinary";

/**
 * The scrapbook/gallery-wall photo browser, minus any page chrome (nav,
 * outer wrapper). Used both by the standalone /photos route and by the
 * Explore room, which mounts it as an in-place overlay so opening the
 * photo board doesn't leave the room.
 */
export function PhotoScrapbook() {
  const years = usePhotos();
  const isMobile = useIsMobile();
  const slotHeight = isMobile ? 160 : 320;
  const bottomPad = isMobile ? 100 : 180;

  // Preload the first 6 photos so they're ready when the page paints
  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    const firstPhotos = years.flatMap(y => y.groups.flatMap(g => g.photos)).slice(0, 6);
    firstPhotos.forEach(photo => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = getCloudinaryUrl(photo.cloudinaryId, isMobile ? 380 : 600);
      document.head.appendChild(link);
    });
  }, []);
  let globalIndex = 0;

  return (
    <>
      <SharedFilters />
      <ScrollProgress />
      <TableBackground />

      <div style={{ position: "relative", margin: "0 auto", maxWidth: 760, paddingLeft: "1%", paddingRight: "1%", zIndex: 1 }}>
        <div style={{ position: "relative", zIndex: 7, paddingTop: 32, paddingBottom: 160 }}>
          <h1 style={{
            fontFamily: "'Lora', Georgia, serif",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "15px",
            letterSpacing: "0.12em",
            color: "var(--foreground)",
            textAlign: "center",
            marginBottom: 24,
          }}>
            photos
          </h1>

          {years.map((yearData, yearIndex) => (
            <div key={yearData.year}>
              <YearDivider year={yearData.year} />
              {yearData.groups.map((group, groupIndex) => {
                const offset = globalIndex;
                globalIndex += group.photos.length;
                return (
                  <div key={group.groupName}>
                    <GroupHeader groupName={group.groupName} photos={group.photos} />
                    <PhotoGroup photos={group.photos} indexOffset={offset} isMobile={isMobile} slotHeight={slotHeight} bottomPad={bottomPad} />
                    {(groupIndex < yearData.groups.length - 1 || yearIndex < years.length - 1) && (
                      <TableObject seed={`${yearData.year}-${group.groupName}`} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <BackToTop />
    </>
  );
}
