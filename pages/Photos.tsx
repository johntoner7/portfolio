import { useEffect } from "react";
import { usePhotos } from "@/hooks/usePhotos";
import { TableBackground } from "@/components/photos/TableBackground";
import { Nav } from "@/components/Nav";
import { YearDivider } from "@/components/photos/YearDivider";
import { GroupHeader } from "@/components/photos/GroupHeader";
import { PhotoGroup } from "@/components/photos/PhotoGroup";
import { TableObject } from "@/components/photos/TableObject";
import { ScrollProgress } from "@/components/photos/ScrollProgress";
import { BackToTop } from "@/components/photos/BackToTop";
import { SharedFilters } from "@/components/photos/SharedFilters";
import { getCloudinaryUrl } from "@/utils/cloudinary";

export function Photos() {
  const years = usePhotos();

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
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden", background: "var(--background)" }}>
      <SharedFilters />
      <ScrollProgress />
      <TableBackground />
      <Nav />

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
            marginBottom: 64,
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
                    <PhotoGroup photos={group.photos} indexOffset={offset} />
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
    </div>
  );
}
