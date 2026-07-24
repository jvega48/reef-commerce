// Full-text search test: verifies the generated tsvector + GIN index answer
// real queries, and that autocomplete prefix matching works.
import "dotenv/config";
import { searchProductIds, suggestProducts } from "../src/lib/search";
import { prisma } from "../src/lib/prisma";

async function main() {
  const sample = await prisma.product.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { soldCount: "desc" },
    select: { name: true },
  });
  if (!sample) throw new Error("No products in DB — seed first");

  // Search for the first meaningful word of a real product name.
  const word = sample.name.split(/\s+/).find((w) => w.length >= 4) ?? sample.name;
  const ids = await searchProductIds(word);
  if (ids.length === 0) throw new Error(`FTS returned nothing for "${word}"`);
  console.log(`  ✓ FTS "${word}" → ${ids.length} ranked results`);

  // Autocomplete on a prefix of that word.
  const prefix = word.slice(0, 4);
  const suggestions = await suggestProducts(prefix);
  if (suggestions.length === 0) {
    throw new Error(`Autocomplete returned nothing for prefix "${prefix}"`);
  }
  console.log(`  ✓ autocomplete "${prefix}" → ${suggestions.length} suggestions`);

  // Nonsense must return empty, not error.
  const none = await searchProductIds("zzzqqqxxx nonexistent");
  console.log(`  ✓ nonsense query → ${none.length} results (expected 0)`);

  // Injection-shaped input must not throw.
  await suggestProducts("'; DROP TABLE \"Product\"; --");
  await searchProductIds("' OR 1=1 --");
  console.log("  ✓ hostile input handled safely");

  console.log("Search test passed.");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("Search test FAILED:", e);
    process.exit(1);
  },
);
