import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [products, articles, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.article.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { products: { some: { product: { status: "ACTIVE" } } } },
      select: { slug: true },
    }),
  ]);

  const staticPages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["", 1, "daily"],
    ["/shop", 0.9, "daily"],
    ["/gift-cards", 0.6, "monthly"],
    ["/learn", 0.6, "weekly"],
    ["/about", 0.5, "monthly"],
    ["/faq", 0.5, "monthly"],
    ["/wholesale", 0.5, "monthly"],
    ["/distributors", 0.4, "monthly"],
    ["/contact", 0.4, "monthly"],
    ["/shipping", 0.4, "monthly"],
    ["/guarantee", 0.4, "monthly"],
    ["/returns", 0.4, "monthly"],
    ["/privacy", 0.3, "yearly"],
    ["/terms", 0.3, "yearly"],
  ];

  return [
    ...staticPages.map(([path, priority, changeFrequency]) => ({
      url: `${base}${path}`,
      changeFrequency,
      priority,
    })),
    ...categories.map((c) => ({
      url: `${base}/shop?category=${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...articles.map((a) => ({
      url: `${base}/learn/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
