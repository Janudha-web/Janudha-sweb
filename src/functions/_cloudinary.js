export function cloudinarySettings() {
  let url;
  try {
    const parsed = new URL(process.env.CLOUDINARY_URL || "");
    if (parsed.protocol === "cloudinary:") url = parsed;
  } catch {
    // Separate environment variables also work without a connection URL.
  }
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || url?.hostname,
    apiKey: process.env.CLOUDINARY_API_KEY || (url && decodeURIComponent(url.username)),
    apiSecret: process.env.CLOUDINARY_API_SECRET || (url && decodeURIComponent(url.password)),
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
  };
}
