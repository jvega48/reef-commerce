import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// PostgreSQL full-text search over Product.search (weighted generated
// tsvector: name A, scientific/sku/vendor B, description C — see the
// platform_expansion migration). websearch_to_tsquery gives forgiving,
// Google-ish syntax; autocomplete adds prefix matching on the last word.
// ---------------------------------------------------------------------------

export interface RankedId {
  id: string;
  rank: number;
}

/** Ranked product ids matching q (empty array for blank/invalid queries). */
export async function searchProductIds(q: string, limit = 200): Promise<string[]> {
  const query = q.trim().slice(0, 100);
  if (!query) return [];
  const rows = await prisma.$queryRaw<RankedId[]>`
    SELECT "id", ts_rank("search", websearch_to_tsquery('english', ${query})) AS rank
    FROM "Product"
    WHERE "search" @@ websearch_to_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}

/**
 * Autocomplete: all words matched, last word as a prefix ("ham" → hammer).
 * Falls back to trigram-free ILIKE on very short input.
 */
export async function suggestProducts(q: string, limit = 6) {
  const query = q.trim().slice(0, 60);
  if (query.length < 2) return [];

  // Build "word1 & word2 & last:*" — sanitize to bare words first.
  const words = query
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return [];
  const tsquery = words
    .map((w, i) => (i === words.length - 1 ? `${w}:*` : w))
    .join(" & ");

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "Product"
    WHERE "status" = 'ACTIVE'
      AND "search" @@ to_tsquery('english', ${tsquery})
    ORDER BY ts_rank("search", to_tsquery('english', ${tsquery})) DESC,
             "soldCount" DESC
    LIMIT ${limit}
  `.catch(() => [] as { id: string }[]); // malformed tsquery input → no results

  if (rows.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      quantity: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
    },
  });
  const order = new Map(rows.map((r, i) => [r.id, i]));
  return products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
