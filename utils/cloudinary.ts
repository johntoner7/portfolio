export function getCloudinaryUrl(publicId: string, width = 800): string {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloud}/image/upload/w_${width},q_auto,f_auto/${publicId}`;
}

/**
 * A 3:4 portrait crop, centred on whatever Cloudinary judges the subject to
 * be: the shape of the prints on the Photos page, so teasers match them.
 */
export function getCloudinaryPortraitUrl(publicId: string, width = 320): string {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const height = Math.round((width * 4) / 3);
  return `https://res.cloudinary.com/${cloud}/image/upload/w_${width},h_${height},c_fill,g_auto,q_auto,f_auto/${publicId}`;
}
