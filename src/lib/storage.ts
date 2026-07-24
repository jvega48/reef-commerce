import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Object storage abstraction.
//
// Cloudflare R2 (S3-compatible) when R2_* env vars are set — required in
// production, because serverless filesystems are read-only and ephemeral, so
// anything written to public/uploads disappears on the next deploy.
//
// Falls back to public/uploads for local development so the whole upload flow
// is exercisable without credentials.
// ---------------------------------------------------------------------------

export function isRemoteStorageConfigured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL,
  );
}

/** Where uploads are going right now — surfaced in the admin UI. */
export function storageBackend(): "r2" | "local" {
  return isRemoteStorageConfigured() ? "r2" : "local";
}

async function getS3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Store bytes under `key` and return the public URL to serve them from.
 * `key` must be a caller-generated safe path (never raw user input).
 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (isRemoteStorageConfigured()) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await getS3();
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Immutable: filenames are content-unique, so cache hard.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const base = process.env.R2_PUBLIC_URL!.replace(/\/+$/, "");
    return `${base}/${key}`;
  }

  const dir = path.join(process.cwd(), "public", "uploads", path.dirname(key));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", key), body);
  return `/uploads/${key}`;
}

/** Best-effort delete. Never throws — a missing blob shouldn't block the DB op. */
export async function deleteObject(url: string): Promise<void> {
  try {
    if (url.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
      return;
    }
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
    if (publicBase && url.startsWith(publicBase) && isRemoteStorageConfigured()) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const s3 = await getS3();
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET!,
          Key: url.slice(publicBase.length + 1),
        }),
      );
    }
    // Remote CDN URLs we don't own (e.g. the migrated Shopify catalog) are
    // left alone — deleting the DB row is the whole operation there.
  } catch {
    /* ignore */
  }
}
