// Repairs image-integrity issues found by scripts/audit-images.ts.
// Dry-run by default; pass --apply to write.
//
// Fixes:
//   1. Non-dense / non-zero-based positions (breaks "primary = position 0")
//   2. Duplicate image rows within a product (same URL twice)
//   3. Rows pointing at local files that no longer exist
//   4. Products sharing an identical image URL (reported — needs a human call)
import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

async function main() {
  let fixedPositions = 0;
  let removedDupes = 0;
  let removedMissing = 0;

  // ── 1 + 2: per-product dedupe and position densification ─────────────────
  const products = await prisma.product.findMany({
    select: {
      id: true,
      images: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, url: true, position: true },
      },
    },
  });

  for (const p of products) {
    if (p.images.length === 0) continue;

    // Drop later rows that repeat an earlier URL for the same product.
    const seen = new Set<string>();
    const dupes: string[] = [];
    const keep: typeof p.images = [];
    for (const img of p.images) {
      if (seen.has(img.url)) dupes.push(img.id);
      else {
        seen.add(img.url);
        keep.push(img);
      }
    }
    if (dupes.length > 0) {
      removedDupes += dupes.length;
      if (APPLY) await prisma.productImage.deleteMany({ where: { id: { in: dupes } } });
    }

    // Densify to 0..n-1 so ordering and primary-image logic are unambiguous.
    const needsRenumber = keep.some((img, i) => img.position !== i);
    if (needsRenumber) {
      fixedPositions++;
      if (APPLY) {
        await prisma.$transaction(
          keep.map((img, i) =>
            prisma.productImage.update({ where: { id: img.id }, data: { position: i } }),
          ),
        );
      }
    }
  }

  // ── 3: local files that vanished ─────────────────────────────────────────
  const localRows = await prisma.productImage.findMany({
    where: { url: { startsWith: "/uploads/" } },
    select: { id: true, url: true },
  });
  const missing = localRows.filter(
    (r) => !existsSync(path.join(process.cwd(), "public", r.url.replace(/^\//, ""))),
  );
  if (missing.length > 0) {
    removedMissing = missing.length;
    if (APPLY) {
      await prisma.productImage.deleteMany({ where: { id: { in: missing.map((m) => m.id) } } });
    }
  }

  // ── 4: identical URL owned by more than one product (report only) ────────
  const all = await prisma.productImage.findMany({
    select: { url: true, productId: true, product: { select: { name: true, sku: true } } },
  });
  const byUrl = new Map<string, { sku: string; name: string }[]>();
  for (const i of all) {
    const list = byUrl.get(i.url) ?? [];
    if (!list.some((l) => l.sku === i.product.sku)) {
      list.push({ sku: i.product.sku, name: i.product.name });
    }
    byUrl.set(i.url, list);
  }
  const shared = [...byUrl.entries()].filter(([, l]) => l.length > 1);

  console.log(`Products scanned: ${products.length}`);
  console.log(`Products needing position renumber: ${fixedPositions}`);
  console.log(`Duplicate rows within a product: ${removedDupes}`);
  console.log(`Rows pointing at missing local files: ${removedMissing}`);
  console.log(`\nURLs shared by multiple products (NOT auto-changed — a human`);
  console.log(`must decide whether these are genuine reuse or a mistake): ${shared.length}`);
  for (const [url, owners] of shared) {
    console.log(`   ${url.slice(0, 64)}…`);
    for (const o of owners) console.log(`      ${o.sku}  ${o.name.slice(0, 52)}`);
  }

  console.log(
    APPLY
      ? "\n✓ Applied."
      : "\nDRY RUN — nothing written. Re-run with --apply to save.",
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
