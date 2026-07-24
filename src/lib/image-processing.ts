import { randomBytes } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { putObject } from "./storage";

// ---------------------------------------------------------------------------
// Upload pipeline: validate → normalize → optimize → store.
//
// Format is detected from the actual file header via sharp, not the
// client-supplied MIME type or extension (both trivially spoofable). Anything
// sharp can't parse as a supported raster image is rejected outright.
// ---------------------------------------------------------------------------

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

// Sharp format id → output content type. Everything is re-encoded to WebP for
// delivery, so this set is only about what we're willing to *read*.
const READABLE = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff", "heif"]);

const VIDEO_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export interface ProcessedImage {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export class ImageRejected extends Error {}

/**
 * Validate + optimize one image and store it (full size + thumbnail).
 * Throws ImageRejected with a human-readable reason on invalid input.
 */
export async function processAndStoreImage(
  buffer: Buffer,
  originalName: string,
): Promise<ProcessedImage> {
  if (buffer.byteLength === 0) throw new ImageRejected("File is empty.");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageRejected(
      `Image is ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
    );
  }

  let meta: Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new ImageRejected(`"${originalName}" isn't a readable image file.`);
  }
  if (!meta.format || !READABLE.has(meta.format)) {
    throw new ImageRejected(
      `"${originalName}" is ${meta.format ?? "an unknown format"} — use JPG, PNG, WebP, AVIF, GIF, HEIC, or TIFF.`,
    );
  }
  if (!meta.width || !meta.height) {
    throw new ImageRejected(`"${originalName}" has no readable dimensions.`);
  }

  const stem = `${Date.now()}-${randomBytes(5).toString("hex")}`;

  // Full size: cap the long edge at 2000px (plenty for zoom), strip EXIF —
  // which also strips GPS coordinates from phone photos, then re-apply
  // orientation so rotated phone shots don't come out sideways.
  const full = await sharp(buffer)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const thumb = await sharp(buffer)
    .rotate()
    .resize({ width: 400, height: 400, fit: "cover", position: "attention" })
    .webp({ quality: 72 })
    .toBuffer();

  const [url, thumbUrl] = await Promise.all([
    putObject(`${stem}.webp`, full.data, "image/webp"),
    putObject(`${stem}-thumb.webp`, thumb, "image/webp"),
  ]);

  return {
    url,
    thumbUrl,
    width: full.info.width,
    height: full.info.height,
    bytes: full.data.byteLength,
  };
}

/**
 * Process a batch of uploaded files and attach them to a product, appending
 * after `startPosition`. Returns per-file rejection messages so callers can
 * surface them (the previous implementation dropped bad files silently).
 *
 * Lives here rather than in the "use server" module so it can be exercised
 * directly by scripts/test-image-pipeline.ts without a request context.
 */
export async function attachUploadedMedia(
  files: File[],
  productId: string,
  startPosition: number,
): Promise<string[]> {
  const { prisma } = await import("./prisma");
  const errors: string[] = [];
  let pos = startPosition;

  for (const file of files) {
    if (file.size === 0) continue;
    const isVideo =
      file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (isVideo) {
        const { url, bytes } = await processAndStoreVideo(buffer, file.name);
        await prisma.productImage.create({
          data: { productId, url, position: pos++, isVideo: true, bytes },
        });
      } else {
        const img = await processAndStoreImage(buffer, file.name);
        await prisma.productImage.create({
          data: {
            productId,
            url: img.url,
            thumbUrl: img.thumbUrl,
            width: img.width,
            height: img.height,
            bytes: img.bytes,
            position: pos++,
            isVideo: false,
          },
        });
      }
    } catch (e) {
      errors.push(
        e instanceof ImageRejected ? e.message : `"${file.name}" could not be processed.`,
      );
    }
  }
  return errors;
}

/** Videos are stored as-is (no transcoding); only type + size are enforced. */
export async function processAndStoreVideo(
  buffer: Buffer,
  originalName: string,
): Promise<{ url: string; bytes: number }> {
  const ext = originalName.slice(originalName.lastIndexOf(".")).toLowerCase();
  const contentType = VIDEO_EXT[ext];
  if (!contentType) {
    throw new ImageRejected(`"${originalName}" — supported video formats are MP4, MOV, and WebM.`);
  }
  if (buffer.byteLength > MAX_VIDEO_BYTES) {
    throw new ImageRejected(
      `Video is ${(buffer.byteLength / 1024 / 1024).toFixed(0)} MB — the limit is ${MAX_VIDEO_BYTES / 1024 / 1024} MB.`,
    );
  }
  const stem = `${Date.now()}-${randomBytes(5).toString("hex")}`;
  const url = await putObject(`${stem}${ext}`, buffer, contentType);
  return { url, bytes: buffer.byteLength };
}
