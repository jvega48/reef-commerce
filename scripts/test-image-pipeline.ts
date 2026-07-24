// Image pipeline test: proves uploads validate, optimize, thumbnail, and store
// end-to-end — including the cases that used to fail silently (oversized files,
// spoofed extensions, non-image bytes).
import "dotenv/config";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  ImageRejected,
  attachUploadedMedia,
  processAndStoreImage,
  processAndStoreVideo,
} from "../src/lib/image-processing";
import { storageBackend } from "../src/lib/storage";
import { prisma } from "../src/lib/prisma";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}
const localPath = (url: string) =>
  path.join(process.cwd(), "public", url.replace(/^\//, ""));

const written: string[] = [];

async function main() {
  console.log(`  storage backend: ${storageBackend()}`);

  // A realistic 3000x2000 photo, ~large enough that the old 1 MB Server Action
  // limit would have rejected the request outright.
  const bigJpeg = await sharp({
    create: { width: 3000, height: 2000, channels: 3, background: { r: 20, g: 140, b: 160 } },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
  console.log(`  source photo: ${(bigJpeg.byteLength / 1024).toFixed(0)} KB, 3000x2000`);

  const out = await processAndStoreImage(bigJpeg, "reef-photo.jpg");
  written.push(out.url, out.thumbUrl);

  assert(out.width <= 2000 && out.height <= 2000, `not downscaled: ${out.width}x${out.height}`);
  assert(out.url.endsWith(".webp"), "full image not converted to webp");
  assert(out.thumbUrl.endsWith(".webp"), "thumb not webp");
  assert(out.url !== out.thumbUrl, "thumb and full share a URL");
  console.log(`  ✓ optimized → ${out.width}x${out.height}, ${(out.bytes / 1024).toFixed(0)} KB webp`);

  if (storageBackend() === "local") {
    assert(existsSync(localPath(out.url)), `full image missing on disk: ${out.url}`);
    assert(existsSync(localPath(out.thumbUrl)), `thumb missing on disk: ${out.thumbUrl}`);
    const thumbMeta = await sharp(localPath(out.thumbUrl)).metadata();
    assert(thumbMeta.width === 400 && thumbMeta.height === 400,
      `thumb should be 400x400, got ${thumbMeta.width}x${thumbMeta.height}`);
    console.log("  ✓ files written to disk; thumbnail is 400x400");
  }

  // EXIF orientation must be baked in, not left as a tag (sideways phone photos).
  const rotated = await sharp({
    create: { width: 800, height: 400, channels: 3, background: { r: 200, g: 90, b: 60 } },
  })
    .jpeg()
    .withMetadata({ orientation: 6 }) // 90° CW
    .toBuffer();
  const rotOut = await processAndStoreImage(rotated, "rotated.jpg");
  written.push(rotOut.url, rotOut.thumbUrl);
  assert(rotOut.width === 400 && rotOut.height === 800,
    `orientation not applied: ${rotOut.width}x${rotOut.height}`);
  console.log("  ✓ EXIF orientation applied (800x400 → 400x800)");

  // PNG with alpha survives.
  const png = await sharp({
    create: { width: 600, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).png().toBuffer();
  const pngOut = await processAndStoreImage(png, "logo.png");
  written.push(pngOut.url, pngOut.thumbUrl);
  console.log("  ✓ PNG with alpha accepted");

  // ── Rejections ───────────────────────────────────────────────────────────
  let rejected = 0;
  const expectReject = async (buf: Buffer, name: string, label: string) => {
    try {
      const r = await processAndStoreImage(buf, name);
      written.push(r.url, r.thumbUrl);
      throw new Error(`${label}: should have been rejected`);
    } catch (e) {
      if (!(e instanceof ImageRejected)) throw e;
      rejected++;
      console.log(`  ✓ rejected ${label}: ${e.message.slice(0, 62)}`);
    }
  };

  // A text file wearing a .jpg extension — the spoofed-MIME case.
  await expectReject(Buffer.from("this is definitely not an image"), "evil.jpg", "fake .jpg");
  await expectReject(Buffer.alloc(0), "empty.jpg", "empty file");
  // Oversized: 20 MB of incompressible noise.
  const huge = Buffer.alloc(20 * 1024 * 1024);
  for (let i = 0; i < huge.length; i += 4096) huge[i] = i % 251;
  await expectReject(huge, "huge.jpg", "oversized file");
  assert(rejected === 3, `expected 3 rejections, got ${rejected}`);

  // Video: extension-gated, no transcode.
  try {
    await processAndStoreVideo(Buffer.from("fake"), "clip.avi");
    throw new Error("unsupported video extension should be rejected");
  } catch (e) {
    if (!(e instanceof ImageRejected)) throw e;
    console.log("  ✓ rejected unsupported video format (.avi)");
  }
  const vid = await processAndStoreVideo(Buffer.from("pretend-mp4-bytes"), "clip.mp4");
  written.push(vid.url);
  console.log("  ✓ MP4 accepted and stored");

  // ── Attach to a real product (the full upload glue) ──────────────────────
  const product = await prisma.product.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true, sku: true, _count: { select: { images: true } } },
  });
  assert(Boolean(product), "no product available to attach to");
  const startCount = product!._count.images;
  const maxPos = await prisma.productImage.aggregate({
    where: { productId: product!.id },
    _max: { position: true },
  });

  const good1 = await sharp({ create: { width: 900, height: 900, channels: 3, background: { r: 30, g: 120, b: 150 } } }).jpeg().toBuffer();
  const good2 = await sharp({ create: { width: 700, height: 500, channels: 3, background: { r: 220, g: 100, b: 40 } } }).png().toBuffer();

  const errors = await attachUploadedMedia(
    [
      new File([new Uint8Array(good1)], "reef-a.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array(good2)], "reef-b.png", { type: "image/png" }),
      // A bad file mixed in must not abort the good ones.
      new File([new Uint8Array(Buffer.from("nope"))], "broken.jpg", { type: "image/jpeg" }),
    ],
    product!.id,
    (maxPos._max.position ?? -1) + 1,
  );

  assert(errors.length === 1, `expected 1 rejection, got ${errors.length}: ${errors.join("|")}`);
  const rows = await prisma.productImage.findMany({
    where: { productId: product!.id },
    orderBy: { position: "asc" },
  });
  assert(
    rows.length === startCount + 2,
    `expected ${startCount + 2} images, found ${rows.length}`,
  );
  const attached = rows.slice(-2);
  for (const r of attached) {
    assert(Boolean(r.thumbUrl), "attached image has no thumbnail");
    assert(Boolean(r.width && r.height), "attached image has no dimensions");
    assert(Boolean(r.bytes), "attached image has no byte size");
    written.push(r.url, r.thumbUrl!);
  }
  assert(
    attached[0].position < attached[1].position,
    "attached images are not sequentially positioned",
  );
  console.log(
    `  ✓ attached 2 images to ${product!.sku} (1 bad file rejected, good ones kept)`,
  );

  // Clean up the DB rows this test created.
  await prisma.productImage.deleteMany({ where: { id: { in: attached.map((a) => a.id) } } });
  console.log("  ✓ test rows removed");

  console.log("Image pipeline test passed.");
}

main()
  .then(() => {
    // Clean up anything this test wrote locally.
    if (storageBackend() === "local") {
      for (const url of written) {
        try { rmSync(localPath(url)); } catch { /* already gone */ }
      }
    }
    process.exit(0);
  })
  .catch((e) => {
    if (storageBackend() === "local") {
      for (const url of written) {
        try { rmSync(localPath(url)); } catch { /* already gone */ }
      }
    }
    console.error("Image pipeline test FAILED:", e);
    process.exit(1);
  });
