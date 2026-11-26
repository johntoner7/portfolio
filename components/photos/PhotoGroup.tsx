import { useCallback, useMemo, useState } from "react";
import type { Photo } from "@/hooks/usePhotos";
import { Polaroid } from "./Polaroid";
import { Lightbox } from "./Lightbox";
import { getSpreadLayout } from "@/utils/photoStyle";

interface PhotoGroupProps {
  photos: Photo[];
  indexOffset: number;
  isMobile: boolean;
  slotHeight: number;
  bottomPad: number;
  /** Lay the group out as a desktop collage instead of the single-column zigzag. */
  spread?: boolean;
}

export function PhotoGroup({ photos, indexOffset, isMobile, slotHeight, bottomPad, spread = false }: PhotoGroupProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  const handleOpen = useCallback((photo: Photo) => setLightboxPhoto(photo), []);
  // Which polaroid is "in hand": hidden on the table while the lightbox shows it.
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const handleClose = useCallback(() => {
    setLightboxPhoto(null);
    setLiftedId(null);
  }, []);

  const spreadLayout = useMemo(() => (spread ? getSpreadLayout(photos.map(p => p.id)) : null), [spread, photos]);
  const containerHeight = spreadLayout ? spreadLayout.height : photos.length * slotHeight + bottomPad;

  return (
    <>
      <div style={{ position: "relative", height: containerHeight, zIndex: 7 }}>
        {photos.map((photo, i) => (
          <Polaroid
            key={photo.id}
            photo={photo}
            index={indexOffset + i}
            slotTop={i * slotHeight}
            isMobile={isMobile}
            onOpen={handleOpen}
            placement={spreadLayout?.placements[i]}
            lifted={photo.id === liftedId}
          />
        ))}
      </div>

      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          groupPhotos={photos}
          onClose={handleClose}
          onCurrentChange={setLiftedId}
        />
      )}
    </>
  );
}
