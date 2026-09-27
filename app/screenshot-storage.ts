export const SCREENSHOT_BUCKET = "log-screenshots";
export const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function screenshotFileError(file: { type: string; size: number }) {
  if (!(SCREENSHOT_TYPES as readonly string[]).includes(file.type)) return "Choose a PNG, JPG or WebP image.";
  if (file.size > MAX_SCREENSHOT_BYTES) return "Choose an image smaller than 8 MB.";
  return "";
}

export function screenshotExtension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function screenshotObjectPath(userId: string, logId: number, uniqueId: string, type: string) {
  return `${userId}/${logId}/${uniqueId}.${screenshotExtension(type)}`;
}
