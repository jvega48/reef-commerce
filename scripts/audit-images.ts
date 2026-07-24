// Read-only image integrity audit. Reports facts about the current state of
// ProductImage rows and the files they point at. Changes nothing.
import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [totalImages, totalProducts] = await Promise.all([
    prisma.productImage.count(),
    prisma.product.count(),
  ]);
  console.log(`Products: ${totalProducts}   ProductImage rows: ${totalImages}\n`);

  // 1. URL sources — where do images actually live?
  const images = await prisma.productImage.findMany({
    select: { id: true, url: true, productId: true, position: true, isVideo: true },
  });
  const sources = new Map<string, number>();
  for (const i of images) {
    let key = "other";
    if (i.url.startsWith("/uploads/")) key = "local /uploads";
    else if (i.url.includes("cdn.shopify.com")) key = "cdn.shopify.com (hotlinked)";
    else if (i.url.startsWith("http")) key = "other remote";
    sources.set(key, (sources.get(key) ?? 0) + 1);
  }
  console.log("Image URL sources:");
  for (const [k, v] of sources) console.log(`  ${v.toString().padStart(6)}  ${k}`);

  // 2. Orphans — rows whose product no longer exists (FK should prevent this)
  const productIds = new Set(
    (await prisma.product.findMany({ select: { id: true } })).map((p) => p.id),
  );
  const orphans = images.filter((i) => !productIds.has(i.productId));
  console.log(`\nOrphan images (productId with no product): ${orphans.length}`);

  // 3. Duplicate URLs *within the same product* (true duplicates)
  const perProduct = new Map<string, Map<string, number>>();
  for (const i of images) {
    const m = perProduct.get(i.productId) ?? new Map<string, number>();
    m.set(i.url, (m.get(i.url) ?? 0) + 1);
    perProduct.set(i.productId, m);
  }
  let intraDupRows = 0;
  let productsWithIntraDup = 0;
  for (const [, m] of perProduct) {
    let has = false;
    for (const [, n] of m) if (n > 1) { intraDupRows += n - 1; has = true; }
    if (has) productsWithIntraDup++;
  }
  console.log(`Duplicate image rows within a single product: ${intraDupRows} (across ${productsWithIntraDup} products)`);

  // 4. Same URL shared across DIFFERENT products (would mean one product shows
  //    another's photo)
  const urlToProducts = new Map<string, Set<string>>();
  for (const i of images) {
    const s = urlToProducts.get(i.url) ?? new Set<string>();
    s.add(i.productId);
    urlToProducts.set(i.url, s);
  }
  const shared = [...urlToProducts.entries()].filter(([, s]) => s.size > 1);
  console.log(`URLs shared across multiple products: ${shared.length}`);
  for (const [url, s] of shared.slice(0, 5)) {
    console.log(`   ${url.slice(0, 70)} → ${s.size} products`);
  }

  // 5. Local files that don't exist on disk (broken references)
  const localImages = images.filter((i) => i.url.startsWith("/uploads/"));
  const missing = localImages.filter(
    (i) => !existsSync(path.join(process.cwd(), "public", i.url.replace(/^\//, ""))),
  );
  console.log(`\nLocal /uploads rows: ${localImages.length}, missing file on disk: ${missing.length}`);
  for (const m of missing.slice(0, 10)) console.log(`   MISSING ${m.url}`);

  // 6. Products with no images at all
  const noImages = await prisma.product.count({ where: { images: { none: {} } } });
  console.log(`\nProducts with zero images: ${noImages}`);

  // 7. Position integrity — duplicate/!=0-based positions break ordering and
  //    "primary image" (which is just position 0 / lowest).
  let badPositions = 0;
  let noZeroPosition = 0;
  for (const [pid, ] of perProduct) {
    const rows = images.filter((i) => i.productId === pid);
    const positions = rows.map((r) => r.position).sort((a, b) => a - b);
    const uniq = new Set(positions);
    if (uniq.size !== positions.length) badPositions++;
    if (positions.length > 0 && positions[0] !== 0) noZeroPosition++;
  }
  console.log(`Products with duplicate image positions: ${badPositions}`);
  console.log(`Products whose lowest position != 0: ${noZeroPosition}`);

  // 8. Livestock type distribution (the "fish in coral category" claim needs
  //    product-level facts, since images have no category of their own)
  const byType = await prisma.product.groupBy({
    by: ["livestockType"],
    _count: true,
  });
  console.log(`\nProducts by livestockType:`);
  for (const t of byType) console.log(`  ${String(t._count).padStart(6)}  ${t.livestockType}`);

  const catCount = await prisma.category.count();
  console.log(`\nCategories in DB: ${catCount}`);
  const cats = await prisma.category.findMany({
    select: { name: true, slug: true, _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  });
  for (const c of cats.slice(0, 40)) {
    console.log(`  ${String(c._count.products).padStart(5)}  ${c.name}  (${c.slug})`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
