import { cookies } from "next/headers";
import { prisma } from "./prisma";

// Recently-viewed products live in a cookie (12 slugs max) — zero DB writes
// per page view, works for guests, survives sign-in. The product page's
// <RecordView /> client component POSTs to /api/recently-viewed on mount.

export const RV_COOKIE = "av365_rv";
export const RV_MAX = 12;

export async function getRecentlyViewedSlugs(): Promise<string[]> {
  const jar = await cookies();
  try {
    const raw = jar.get(RV_COOKIE)?.value;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string").slice(0, RV_MAX)
      : [];
  } catch {
    return [];
  }
}

/** Fetch the viewable products for the cookie's slugs, preserving order. */
export async function getRecentlyViewedProducts(excludeSlug?: string, limit = 8) {
  const slugs = (await getRecentlyViewedSlugs()).filter((s) => s !== excludeSlug);
  if (slugs.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, status: { in: ["ACTIVE", "SOLD"] } },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, limit);
}
