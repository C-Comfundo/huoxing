import "server-only";

const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const OPTIMIZED_PUBLIC_IMAGE_PATHS = new Set(["/poster.webp"]);

function getExtension(src: string) {
  const lastDotIndex = src.lastIndexOf(".");
  const lastSlashIndex = src.lastIndexOf("/");

  if (lastDotIndex === -1 || lastDotIndex < lastSlashIndex) {
    return "";
  }

  return src.slice(lastDotIndex).toLowerCase();
}

export function getPreferredPublicImagePath(src?: string | null) {
  if (!src) {
    return null;
  }

  if (!src.startsWith("/")) {
    return src;
  }

  const extension = getExtension(src);
  if (!RASTER_EXTENSIONS.has(extension)) {
    return src;
  }

  const optimizedPath = `${src.slice(0, -extension.length)}.webp`;

  // Keep the preference logic deterministic without relying on runtime filesystem access.
  return OPTIMIZED_PUBLIC_IMAGE_PATHS.has(optimizedPath) ? optimizedPath : src;
}
