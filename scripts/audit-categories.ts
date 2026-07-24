// Read-only: detects products whose livestockType disagrees with the category
// they're filed under (the checkable form of "fish images in coral category" —
// images themselves have no category in this schema; products do).
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Expected livestockType for each category slug. Slugs not listed are mixed or
// unconstrained and are skipped.
const CORAL_SLUGS = ["lps", "sps", "soft-corals-2026", "non-photosynthetic-coral"];
const FISH_SLUGS = [
  "angelfish", "anthias", "basslet", "blenny", "butterfly", "cardinal",
  "clownfish", "file-fish", "goby", "hawkfish", "hogfish", "jawfish",
  "lionfish", "parrotfish", "parrotfish-1", "rabbitfish", "scorpionfish",
  "sharks-stingray", "tangs", "tilefish", "wrasse",
];
const INVERT_SLUGS = ["crabs", "sea-urchin", "seaslugs-nudibranch", "shrimp", "snail", "starfish", "clam"];
const ANEMONE_SLUGS = ["anemone"]; // anemones are INVERTEBRATE in this catalog

const EXPECT: Record<string, string[]> = {};
for (const s of CORAL_SLUGS) EXPECT[s] = ["CORAL"];
for (const s of FISH_SLUGS) EXPECT[s] = ["FISH"];
for (const s of INVERT_SLUGS) EXPECT[s] = ["INVERTEBRATE"];
for (const s of ANEMONE_SLUGS) EXPECT[s] = ["INVERTEBRATE", "CORAL"];

async function main() {
  const links = await prisma.productCategory.findMany({
    include: {
      product: { select: { id: true, name: true, sku: true, livestockType: true } },
      category: { select: { name: true, slug: true } },
    },
  });

  const mismatches = links.filter((l) => {
    const expected = EXPECT[l.category.slug];
    return expected && !expected.includes(l.product.livestockType);
  });

  console.log(`Product↔category links: ${links.length}`);
  console.log(`Type/category mismatches: ${mismatches.length}\n`);

  const byCategory = new Map<string, typeof mismatches>();
  for (const m of mismatches) {
    const k = `${m.category.name} (${m.category.slug}) expects ${EXPECT[m.category.slug].join("/")}`;
    byCategory.set(k, [...(byCategory.get(k) ?? []), m]);
  }
  for (const [cat, rows] of byCategory) {
    console.log(`${cat} — ${rows.length} wrong:`);
    for (const r of rows.slice(0, 12)) {
      console.log(`   [${r.product.livestockType}] ${r.product.sku}  ${r.product.name.slice(0, 60)}`);
    }
    if (rows.length > 12) console.log(`   …and ${rows.length - 12} more`);
    console.log();
  }

  // Products with no category at all
  const uncategorized = await prisma.product.count({ where: { categories: { none: {} } } });
  console.log(`Products with no category: ${uncategorized}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
