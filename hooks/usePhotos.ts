import photosData from "@/data/photos.json";

export interface Photo {
  id: string;
  cloudinaryId: string;
  year: number;
  group: string;
  caption: string;
  metadata: {
    dateTaken: string;
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

  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, groupMap]) => ({
      year,
      groups: Array.from(groupMap.entries()).map(([groupName, groupPhotos]) => ({
        groupName,
        photos: groupPhotos.slice().sort((a, b) =>
          b.metadata.dateTaken.localeCompare(a.metadata.dateTaken)
        ),
      })),
    }));
}
