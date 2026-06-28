import { useState } from "react";
import type { Photo } from "@/hooks/usePhotos";
import { Polaroid } from "./Polaroid";
import { Lightbox } from "./Lightbox";

interface PhotoGroupProps {
  photos: Photo[];
  indexOffset: number;
}

// Vertical space allocated per photo. Photos scatter ±80px within their slot,
// so slots need enough room that photos don't completely swamp each other.
const isMobileDevice = () => typeof window !== "undefined" && window.innerWidth < 640;
const SLOT_HEIGHT = isMobileDevice() ? 160 : 320;
const BOTTOM_PAD = isMobileDevice() ? 100 : 180;

export function PhotoGroup({ photos, indexOffset }: PhotoGroupProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);


  const containerHeight = photos.length * SLOT_HEIGHT + BOTTOM_PAD;

  return (
    <>
      <div style={{ position: "relative", height: containerHeight, zIndex: 7 }}>
        {photos.map((photo, i) => (
          <Polaroid
            key={photo.id}
            photo={photo}
            index={indexOffset + i}
            slotTop={i * SLOT_HEIGHT}
            onOpen={setLightboxPhoto}
          />
        ))}
      </div>

      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          groupPhotos={photos}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </>
  );
}
