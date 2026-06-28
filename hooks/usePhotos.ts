import photosData from "@/data/photos.json";

export interface Photo {
  id: string;
  cloudinaryId: string;
  year: number;
  group: string;
  caption: string;
  metadata: {
    dateTaken: string;
    timeTaken: string;
    location: string;
    camera: string;
    tags: string[];
  };
}

export interface PhotoGroup {
  groupName: string;
  photos: Photo[];
}

export interface PhotoYear {
  year: number;
  groups: PhotoGroup[];
}

export function usePhotos(): PhotoYear[] {
  const photos = photosData as Photo[];

  const byYear = new Map<number, Map<string, Photo[]>>();

  for (const photo of photos) {
    if (!byYear.has(photo.year)) byYear.set(photo.year, new Map());
    const yearMap = byYear.get(photo.year)!;
    if (!yearMap.has(photo.group)) yearMap.set(photo.group, []);
    yearMap.get(photo.group)!.push(photo);
  }

  const photoDateTime = (p: Photo) =>
    p.metadata.dateTaken + "T" + (p.metadata.timeTaken || "00:00:00");

  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)                          // year: newest first
    .map(([year, groupMap]) => ({
      year,
      groups: Array.from(groupMap.entries())
        .map(([groupName, groupPhotos]) => ({
          groupName,
          photos: groupPhotos.slice().sort((a, b) =>
            photoDateTime(a).localeCompare(photoDateTime(b)) // photos: oldest first
          ),
        }))
        .sort((a, b) => {
          // group: newest first — compare each group's latest photo
          const latestA = photoDateTime(a.photos[a.photos.length - 1]);
          const latestB = photoDateTime(b.photos[b.photos.length - 1]);
          return latestB.localeCompare(latestA);
        }),
    }));
}
