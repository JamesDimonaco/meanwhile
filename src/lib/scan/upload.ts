export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";
export type UploadError = "bad-image" | "too-large";
export type UploadCheck = { ok: true; mediaType: ImageMediaType } | { ok: false; error: UploadError };

const SIGNATURES: Record<ImageMediaType, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x),
  "image/webp": (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
};

function ascii(b: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...b.subarray(from, to));
}

function isImageMediaType(type: string): type is ImageMediaType {
  return Object.hasOwn(SIGNATURES, type);
}

/** Before reading the body: the declared type and length. */
export function checkUploadHeaders(contentType: string | null, contentLength: string | null): UploadCheck {
  const type = contentType?.split(";")[0].trim().toLowerCase() ?? "";
  if (!isImageMediaType(type)) return { ok: false, error: "bad-image" };
  if (contentLength !== null && Number(contentLength) > MAX_UPLOAD_BYTES) return { ok: false, error: "too-large" };
  return { ok: true, mediaType: type };
}

/** After reading the body: its real size, and bytes that match the declared type. */
export function checkUploadBytes(mediaType: ImageMediaType, bytes: Uint8Array): UploadCheck {
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: "too-large" };
  if (!SIGNATURES[mediaType](bytes)) return { ok: false, error: "bad-image" };
  return { ok: true, mediaType };
}
