// Reclassifies products whose `livestockType` disagrees with what their name /
// scientific name say. Dry-run by default; pass --apply to write.
//
//   npx tsx scripts/fix-livestock-types.ts          # report only
//   npx tsx scripts/fix-livestock-types.ts --apply  # write changes
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { classifyLivestock } from "../src/lib/classify";

const APPLY = process.argv.includes("--apply");
// Only genus-level matches are trusted for automatic writes; keyword hits are
// reported for review unless --include-keywords is passed.
const INCLUDE_KEYWORDS = process.argv.includes("--include-keywords");

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, scientificName: true, livestockType: true },
    orderBy: { sku: "asc" },
  });

  const changes: {
    id: string; sku: string; name: string;
    from: string; to: string; reason: string; confidence: string;
  }[] = [];
  const unresolved: typeof products = [];
  const ambiguous: { p: (typeof products)[number]; reason: string }[] = [];

  for (const p of products) {
    const result = classifyLivestock(p.name, p.scientificName);
    if (!result.type) {
      if (result.confidence === "ambiguous") ambiguous.push({ p, reason: result.reason });
      else unresolved.push(p);
      continue;
    }
    if (result.type === p.livestockType) continue;
    if (result.confidence === "keyword" && !INCLUDE_KEYWORDS) {
      // still record it so the report shows the full picture
      changes.push({
        id: p.id, sku: p.sku, name: p.name, from: p.livestockType,
        to: result.type, reason: result.reason, confidence: "keyword (skipped)",
      });
      continue;
    }
    changes.push({
      id: p.id, sku: p.sku, name: p.name, from: p.livestockType,
      to: result.type, reason: result.reason, confidence: result.confidence,
    });
  }

  const writable = changes.filter((c) => !c.confidence.includes("skipped"));

  console.log(`Scanned ${products.length} products`);
  console.log(`Reclassifications proposed: ${changes.length} (writable now: ${writable.length})`);
  console.log(`Unclassifiable (left alone): ${unresolved.length}\n`);

  const byTransition = new Map<string, typeof changes>();
  for (const c of changes) {
    const k = `${c.from} → ${c.to}`;
    byTransition.set(k, [...(byTransition.get(k) ?? []), c]);
  }
  const VERBOSE = process.argv.includes("--verbose");
  const limit = VERBOSE ? Number.MAX_SAFE_INTEGER : 8;
  for (const [k, rows] of [...byTransition.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${k}: ${rows.length}`);
    for (const r of rows.slice(0, limit)) {
      console.log(`   ${r.sku}  ${r.name.slice(0, 58).padEnd(58)} (${r.reason})`);
    }
    if (rows.length > limit) console.log(`   …and ${rows.length - limit} more`);
    console.log();
  }

  if (ambiguous.length > 0) {
    console.log(`⚠ AMBIGUOUS — needs a human decision (never auto-written): ${ambiguous.length}`);
    for (const a of ambiguous) {
      console.log(`   [${a.p.livestockType}] ${a.p.sku}  ${a.p.name.slice(0, 50)}`);
      console.log(`        ${a.reason}`);
    }
    console.log();
  }

  if (unresolved.length > 0) {
    console.log("Unclassifiable sample (kept as-is):");
    for (const p of unresolved.slice(0, 15)) {
      console.log(`   [${p.livestockType}] ${p.sku}  ${p.name.slice(0, 60)}`);
    }
    console.log();
  }

  if (!APPLY) {
    console.log("DRY RUN — nothing written. Re-run with --apply to save.");
    process.exit(0);
  }

  let updated = 0;
  for (const c of writable) {
    await prisma.product.update({
      where: { id: c.id },
      data: { livestockType: c.to as never },
    });
    updated++;
  }
  console.log(`✓ Updated ${updated} products.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
