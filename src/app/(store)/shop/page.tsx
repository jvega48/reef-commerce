import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, LivestockType } from "@/generated/prisma/client";
import ProductCard from "@/components/ProductCard";

const PAGE_SIZE = 24;

const TYPE_PILLS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Corals", value: "CORAL" },
  { label: "Fish", value: "FISH" },
  { label: "Inverts", value: "INVERTEBRATE" },
  { label: "Merch", value: "MERCH" },
];

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  new: { createdAt: "desc" },
  "price-asc": { price: "asc" },
  "price-desc": { price: "desc" },
  name: { name: "asc" },
};

interface ShopParams {
  q?: string;
  type?: string;
  category?: string;
  sort?: string;
  page?: string;
  stock?: string;
}

export const metadata = { title: "Shop" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const sort = SORTS[params.sort ?? "new"] ? (params.sort ?? "new") : "new";

  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (params.type && ["CORAL", "FISH", "INVERTEBRATE", "DRY_GOOD", "MERCH"].includes(params.type)) {
    where.livestockType = params.type as LivestockType;
  }
  if (params.category) {
    where.categories = { some: { category: { slug: params.category } } };
  }
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { scientificName: { contains: params.q, mode: "insensitive" } },
      { tags: { hasSome: [params.q] } },
    ];
  }
  if (params.stock === "in") where.quantity = { gt: 0 };

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { products: { some: { product: { status: "ACTIVE" } } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const linkFor = (overrides: Partial<ShopParams>) => {
    const merged = { ...params, page: undefined, ...overrides } as Record<string, string | undefined>;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">Shop</h1>
      <p className="mt-1 text-sm text-slate-400">{total} products</p>

      {/* Type pills + search */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {TYPE_PILLS.map((t) => (
          <Link
            key={t.label}
            href={linkFor({ type: t.value || undefined, category: undefined })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              (params.type ?? "") === t.value && !params.category
                ? "bg-reef-500 text-abyss-950"
                : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
        <form action="/shop" className="ml-auto flex gap-2">
          {params.type && <input type="hidden" name="type" value={params.type} />}
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search corals, fish…"
            className="w-56 rounded-full border border-abyss-700 bg-abyss-900 px-4 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-8 md:flex-row">
        {/* Category sidebar */}
        <aside className="w-full shrink-0 md:w-52">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Categories
          </p>
          <ul className="space-y-1 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={linkFor({ category: c.slug, type: undefined })}
                  className={`block rounded px-2 py-1 transition ${
                    params.category === c.slug
                      ? "bg-abyss-800 font-semibold text-reef-300"
                      : "text-slate-300 hover:bg-abyss-900 hover:text-reef-300"
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between text-sm">
            <div className="flex gap-2">
              <Link
                href={linkFor({ stock: params.stock === "in" ? undefined : "in" })}
                className={`rounded-full px-3 py-1 ${
                  params.stock === "in"
                    ? "bg-reef-500 text-abyss-950"
                    : "bg-abyss-800 text-slate-300"
                }`}
              >
                In stock only
              </Link>
            </div>
            <div className="flex gap-2 text-slate-400">
              {Object.keys(SORTS).map((s) => (
                <Link
                  key={s}
                  href={linkFor({ sort: s })}
                  className={sort === s ? "font-semibold text-reef-300" : "hover:text-reef-300"}
                >
                  {{ new: "Newest", "price-asc": "Price ↑", "price-desc": "Price ↓", name: "A–Z" }[s]}
                </Link>
              ))}
            </div>
          </div>

          {products.length === 0 ? (
            <p className="py-16 text-center text-slate-400">No products match those filters.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2 text-sm">
              {page > 1 && (
                <Link href={linkFor({ page: String(page - 1) })} className="rounded bg-abyss-800 px-3 py-1.5 hover:bg-abyss-700">
                  ← Prev
                </Link>
              )}
              <span className="px-3 py-1.5 text-slate-400">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link href={linkFor({ page: String(page + 1) })} className="rounded bg-abyss-800 px-3 py-1.5 hover:bg-abyss-700">
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
