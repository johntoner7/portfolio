import { useCallback, useState } from "react";
import type { Photo } from "@/hooks/usePhotos";
import { Polaroid } from "./Polaroid";
import { Lightbox } from "./Lightbox";

interface PhotoGroupProps {
  photos: Photo[];
  indexOffset: number;
  isMobile: boolean;
  slotHeight: number;
  bottomPad: number;
}

export function PhotoGroup({ photos, indexOffset, isMobile, slotHeight, bottomPad }: PhotoGroupProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  const handleOpen = useCallback((photo: Photo) => setLightboxPhoto(photo), []);
  const handleClose = useCallback(() => setLightboxPhoto(null), []);

  const containerHeight = photos.length * slotHeight + bottomPad;

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
          />
        ))}
      </div>

      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          groupPhotos={photos}
          onClose={handleClose}
        />
      )}
    </>
  );
}
