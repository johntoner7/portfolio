import { useScroll, useTransform } from "framer-motion";
import { usePhotos } from "@/hooks/usePhotos";
import { TableBackground } from "@/components/photos/TableBackground";
import { PhotosNav } from "@/components/photos/PhotosNav";
import { YearDivider } from "@/components/photos/YearDivider";
import { PhotoGroup } from "@/components/photos/PhotoGroup";
import { TableObject } from "@/components/photos/TableObject";

export function Photos() {
  const years = usePhotos();

  const { scrollY } = useScroll();
  const lampY = useTransform(scrollY, [0, 2000], [0, -70]);
  const lampOpacity = useTransform(scrollY, [0, 600], [1, 0.7]);

  let globalIndex = 0;

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      <div style={{ position: "relative", margin: "0 auto", maxWidth: 760, paddingLeft: "1%", paddingRight: "1%", zIndex: 1 }}>

        <PhotosNav />
        <TableBackground lampY={lampY} lampOpacity={lampOpacity} />

        <div style={{ position: "relative", zIndex: 7, paddingTop: 100, paddingBottom: 160 }}>
          <h1 style={{
            fontFamily: "'Lora', Georgia, serif",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "15px",
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.75)",
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
    </div>
  );
}
