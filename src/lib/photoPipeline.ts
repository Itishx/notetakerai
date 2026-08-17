/**
 * Client-side photo pipeline. Runs entirely in the browser before anything uploads.
 *
 * Why here and not on a server: generating derivatives costs CPU, and the user's
 * device already has a free one. No function invocations, no cold starts, and the
 * bytes only cross the wire once each.
 *
 * The economics of the whole product live in THUMB_EDGE. A grid that renders
 * originals moves ~3 MB per tile; a grid that renders these thumbs moves ~15 KB.
 */

export const THUMB_EDGE = 320;    // grid tile
export const PREVIEW_EDGE = 1600; // lightbox
export const THUMB_QUALITY = 0.72;
export const PREVIEW_QUALITY = 0.82;

export interface DerivedPhoto {
  sha256: string;
  width: number;
  height: number;
  takenAt: Date | null;
  blurData: string;
  original: Blob;
  preview: Blob;
  thumb: Blob;
  previewExt: string;
  thumbExt: string;
}

/** Content address. Identical bytes always produce the same key, so dedupe is free. */
export async function sha256Hex(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** WebP where the browser has it, JPEG where it does not. Decided once, cached. */
let webpSupport: boolean | null = null;
function supportsWebP(): boolean {
  if (webpSupport !== null) return webpSupport;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupport;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), type, quality);
  });
}

/** Longest edge fits `edge`; never upscales a photo that is already smaller. */
function fit(width: number, height: number, edge: number) {
  const scale = Math.min(1, edge / Math.max(width, height));
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}

async function resize(bitmap: ImageBitmap, edge: number, quality: number) {
  const { w, h } = fit(bitmap.width, bitmap.height, edge);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  const useWebP = supportsWebP();
  const blob = await canvasToBlob(canvas, useWebP ? "image/webp" : "image/jpeg", quality);
  return { blob, ext: useWebP ? "webp" : "jpg", width: w, height: h };
}

/**
 * A 16x16 JPEG data URI, ~350 bytes, stored in the row itself.
 * It paints the instant the row arrives, so the grid never shows an empty box.
 */
async function makeBlurData(bitmap: ImageBitmap): Promise<string> {
  const canvas = document.createElement("canvas");
  const { w, h } = fit(bitmap.width, bitmap.height, 16);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.5);
}

/* ---------------------------------------------------------------------------
 * EXIF: we only want one field, so we walk to it by hand rather than adding a
 * parser dependency for 40 KB. DateTimeOriginal is what makes the timeline real.
 * ------------------------------------------------------------------------- */

export function readExifTakenAt(buffer: ArrayBuffer): Date | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG

    // Walk the JPEG marker chain looking for APP1/Exif.
    let offset = 2;
    let tiffStart = -1;
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      const size = view.getUint16(offset + 2);
      if (marker === 0xe1 && view.getUint32(offset + 4) === 0x45786966) {
        tiffStart = offset + 10; // skip "Exif\0\0"
        break;
      }
      if (marker === 0xda) break; // start of scan, no EXIF present
      offset += 2 + size;
    }
    if (tiffStart < 0 || tiffStart + 8 > view.byteLength) return null;

    const little = view.getUint16(tiffStart) === 0x4949;
    const u16 = (p: number) => view.getUint16(p, little);
    const u32 = (p: number) => view.getUint32(p, little);

    const ifd0 = tiffStart + u32(tiffStart + 4);
    const readAscii = (entry: number, len: number) => {
      const at = len > 4 ? tiffStart + u32(entry + 8) : entry + 8;
      let text = "";
      for (let i = 0; i < len - 1 && at + i < view.byteLength; i++) text += String.fromCharCode(view.getUint8(at + i));
      return text;
    };

    // IFD0 holds a pointer to the Exif sub-IFD (tag 0x8769) where the date lives.
    let exifIfd = -1;
    const count0 = u16(ifd0);
    for (let i = 0; i < count0; i++) {
      const entry = ifd0 + 2 + i * 12;
      if (u16(entry) === 0x8769) { exifIfd = tiffStart + u32(entry + 8); break; }
    }
    if (exifIfd < 0 || exifIfd + 2 > view.byteLength) return null;

    // 0x9003 DateTimeOriginal, falling back to 0x9004 DateTimeDigitized.
    let raw = "";
    const count1 = u16(exifIfd);
    for (let i = 0; i < count1; i++) {
      const entry = exifIfd + 2 + i * 12;
      const tag = u16(entry);
      if (tag === 0x9003 || (tag === 0x9004 && !raw)) {
        raw = readAscii(entry, u32(entry + 4));
        if (tag === 0x9003) break;
      }
    }
    if (!raw) return null;

    // EXIF format is "YYYY:MM:DD HH:MM:SS" and carries no zone, so read it as local.
    const m = raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    const date = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function isProbablyHeic(file: File) {
  return /\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type);
}

/** Everything a photo needs, computed in one pass over the file. */
export async function derivePhoto(file: File): Promise<DerivedPhoto> {
  const buffer = await file.arrayBuffer();
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  let bitmap: ImageBitmap;
  try {
    // from-image applies EXIF rotation for us, so portrait shots are not sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      isProbablyHeic(file)
        ? "HEIC is not readable in this browser. Export as JPEG, or open BrainoPhotos in Safari."
        : "This file could not be read as an image.",
    );
  }

  try {
    const [preview, thumb, blurData] = await Promise.all([
      resize(bitmap, PREVIEW_EDGE, PREVIEW_QUALITY),
      resize(bitmap, THUMB_EDGE, THUMB_QUALITY),
      makeBlurData(bitmap),
    ]);

    return {
      sha256,
      width: bitmap.width,
      height: bitmap.height,
      takenAt: readExifTakenAt(buffer) ?? (file.lastModified ? new Date(file.lastModified) : null),
      blurData,
      original: file,
      preview: preview.blob,
      thumb: thumb.blob,
      previewExt: preview.ext,
      thumbExt: thumb.ext,
    };
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
