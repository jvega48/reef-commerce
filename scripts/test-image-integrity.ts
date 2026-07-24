// Regression guard for image data integrity. Fails the build if the catalog
// drifts back into a broken state (orphans, duplicate rows, non-dense
// ordering, or products whose type contradicts their category).
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { classifyLivestock } from "../src/lib/classify";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  // 1. No orphaned images (FK + cascade should make this impossible).
  const images = await prisma.productImage.findMany({
    select: { id: true, url: true, productId: true, position: true },
  });
  const productIds = new Set(
    (await prisma.product.findMany({ select: { id: true } })).map((p) => p.id),
  );
  const orphans = images.filter((i) => !productIds.has(i.productId));
  assert(orphans.length === 0, `${orphans.length} orphaned image rows`);
  console.log(`  ✓ no orphaned images (${images.length} rows)`);

  // 2. Positions are dense and 0-based per product — "primary image" depends
  //    on position 0 existing.
  const byProduct = new Map<string, number[]>();
  for (const i of images) {
    byProduct.set(i.productId, [...(byProduct.get(i.productId) ?? []), i.position]);
  }
  let badOrdering = 0;
  for (const [, positions] of byProduct) {
    const sorted = [...positions].sort((a, b) => a - b);
    const dense = sorted.every((p, idx) => p === idx);
    if (!dense) badOrdering++;
  }
  assert(badOrdering === 0, `${badOrdering} products have non-dense image positions`);
  console.log(`  ✓ every product has dense 0-based image ordering`);

  // 3. No duplicate image rows within a product.
  let intraDupes = 0;
  const productUrls = new Map<string, Set<string>>();
  for (const i of images) {
    const set = productUrls.get(i.productId) ?? new Set<string>();
    if (set.has(i.url)) intraDupes++;
    set.add(i.url);
    productUrls.set(i.productId, set);
  }
  assert(intraDupes === 0, `${intraDupes} duplicate image rows within products`);
  console.log(`  ✓ no duplicate images within a product`);

  // 4. Every product's livestockType agrees with its name/scientific name
  //    where the classifier is confident. This is the guard that keeps fish
  //    from reappearing under coral browsing.
  const products = await prisma.product.findMany({
    select: { sku: true, name: true, scientificName: true, livestockType: true },
  });
  const wrong = products.filter((p) => {
    const r = classifyLivestock(p.name, p.scientificName);
    return r.type !== null && r.type !== p.livestockType;
  });
  assert(
    wrong.length === 0,
    `${wrong.length} products contradict their classification, e.g. ` +
      wrong.slice(0, 3).map((w) => `${w.sku} "${w.name}" is ${w.livestockType}`).join("; "),
  );
  console.log(`  ✓ all ${products.length} products match their classified type`);

  console.log("Image integrity test passed.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Image integrity test FAILED:", e);
  process.exit(1);
});
