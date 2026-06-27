export function getCloudinaryUrl(publicId: string, width = 800): string {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloud}/image/upload/w_${width},q_auto,f_auto/${publicId}`;
}
