import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { searchProductIds } from "@/lib/search";
import type { Prisma, LivestockType, CareLevel } from "@/generated/prisma/client";
import ProductCard from "@/components/ProductCard";

const PAGE_SIZE = 24;

const TYPE_PILLS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Corals", value: "CORAL" },
  { label: "Fish", value: "FISH" },
  { label: "Inverts", value: "INVERTEBRATE" },
  { label: "Merch", value: "MERCH" },
];

const CARE_LEVELS: CareLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput | null> = {
  relevance: null, // FTS rank order — only meaningful with a query
  new: { createdAt: "desc" },
  popular: { soldCount: "desc" },
  rating: { ratingAvg: "desc" },
  "price-asc": { price: "asc" },
  "price-desc": { price: "desc" },
  name: { name: "asc" },
};
const SORT_LABELS: Record<string, string> = {
  relevance: "Relevance",
  new: "Newest",
  popular: "Popular",
  rating: "Top Rated",
  "price-asc": "Price ↑",
  "price-desc": "Price ↓",
  name: "A–Z",
};

interface ShopParams {
  q?: string;
  type?: string;
  category?: string;
  sort?: string;
  page?: string;
  stock?: string;
  min?: string;
  max?: string;
  brand?: string;
  care?: string;
}

export const metadata = { title: "Shop" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const hasQuery = Boolean(params.q?.trim());
  const defaultSort = hasQuery ? "relevance" : "new";
  const sort = params.sort && SORTS[params.sort] !== undefined ? params.sort : defaultSort;

  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (params.type && ["CORAL", "FISH", "INVERTEBRATE", "DRY_GOOD", "MERCH"].includes(params.type)) {
    where.livestockType = params.type as LivestockType;
  }
  if (params.category) {
    where.categories = { some: { category: { slug: params.category } } };
  }
  if (params.stock === "in") where.quantity = { gt: 0 };
  if (params.brand) where.vendor = params.brand;
  if (params.care && (CARE_LEVELS as string[]).includes(params.care)) {
    where.careLevel = params.care as CareLevel;
  }
  const min = Number(params.min);
  const max = Number(params.max);
  if (Number.isFinite(min) && min > 0) where.price = { ...(where.price as object), gte: min };
  if (Number.isFinite(max) && max > 0) where.price = { ...(where.price as object), lte: max };

  // Full-text search: ranked ids from Postgres, everything else filters on top.
  let rankedIds: string[] | null = null;
  if (hasQuery) {
    rankedIds = await searchProductIds(params.q!);
    where.id = { in: rankedIds };
  }

  const useRelevance = sort === "relevance" && rankedIds !== null;

  const [products, total, categories, brands] = await Promise.all([
    useRelevance
      ? // Relevance order lives in rankedIds — fetch all matches (bounded at
        // 200 by the search) and page in application code.
        prisma.product.findMany({
          where,
          include: { images: { orderBy: { position: "asc" }, take: 1 } },
        })
      : prisma.product.findMany({
          where,
          include: { images: { orderBy: { position: "asc" }, take: 1 } },
          orderBy: SORTS[sort] ?? { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { products: { some: { product: { status: "ACTIVE" } } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.groupBy({
      by: ["vendor"],
      where: { status: "ACTIVE", vendor: { not: null } },
      _count: true,
      orderBy: { _count: { vendor: "desc" } },
      take: 12,
    }),
  ]);

  let pageProducts = products;
  if (useRelevance && rankedIds) {
    const order = new Map(rankedIds.map((id, i) => [id, i]));
    pageProducts = [...products]
      .sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9))
      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const linkFor = (overrides: Partial<ShopParams>) => {
    const merged = { ...params, page: undefined, ...overrides } as Record<string, string | undefined>;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  const sortOptions = hasQuery
    ? Object.keys(SORTS)
    : Object.keys(SORTS).filter((s) => s !== "relevance");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">
        {hasQuery ? <>Search: &ldquo;{params.q}&rdquo;</> : "Shop"}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        {total} product{total === 1 ? "" : "s"}
        {hasQuery && (
          <>
            {" · "}
            <Link href={linkFor({ q: undefined, sort: undefined })} className="text-reef-400 hover:text-reef-300">
              clear search ✕
            </Link>
          </>
        )}
      </p>

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
            aria-label="Search products"
            placeholder="Search corals, fish…"
            className="w-56 rounded-full border border-abyss-700 bg-abyss-900 px-4 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-8 md:flex-row">
        {/* Filters sidebar */}
        <aside className="w-full shrink-0 md:w-52">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Categories
          </p>
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={linkFor({
                    category: params.category === c.slug ? undefined : c.slug,
                    type: undefined,
                  })}
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

          {/* Price */}
          <p className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Price
          </p>
          <form action="/shop" className="flex items-center gap-2 text-sm">
            {Object.entries(params)
              .filter(([k, v]) => v && !["min", "max", "page"].includes(k))
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <input
              type="number" name="min" min={0} placeholder="Min"
              defaultValue={params.min ?? ""}
              aria-label="Minimum price"
              className="w-full rounded-lg border border-abyss-700 bg-abyss-900 px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
            />
            <span className="text-slate-500">–</span>
            <input
              type="number" name="max" min={0} placeholder="Max"
              defaultValue={params.max ?? ""}
              aria-label="Maximum price"
              className="w-full rounded-lg border border-abyss-700 bg-abyss-900 px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
            />
            <button className="rounded-lg bg-abyss-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-abyss-600">
              Go
            </button>
          </form>

          {/* Care level */}
          <p className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Care Level
          </p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {CARE_LEVELS.map((c) => (
              <Link
                key={c}
                href={linkFor({ care: params.care === c ? undefined : c })}
                className={`rounded-full px-2.5 py-1 transition ${
                  params.care === c
                    ? "bg-reef-500 font-bold text-abyss-950"
                    : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"
                }`}
              >
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </Link>
            ))}
          </div>

          {/* Brand / vendor */}
          {brands.length > 1 && (
            <>
              <p className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Brand
              </p>
              <ul className="space-y-1 text-sm">
                {brands.map((b) => (
                  <li key={b.vendor}>
                    <Link
                      href={linkFor({ brand: params.brand === b.vendor ? undefined : b.vendor! })}
                      className={`block rounded px-2 py-1 transition ${
                        params.brand === b.vendor
                          ? "bg-abyss-800 font-semibold text-reef-300"
                          : "text-slate-300 hover:bg-abyss-900 hover:text-reef-300"
                      }`}
                    >
                      {b.vendor} <span className="text-xs text-slate-500">({b._count})</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        {/* Grid */}
        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
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
            <div className="flex flex-wrap gap-2 text-slate-400">
              {sortOptions.map((s) => (
                <Link
                  key={s}
                  href={linkFor({ sort: s })}
                  className={sort === s ? "font-semibold text-reef-300" : "hover:text-reef-300"}
                >
                  {SORT_LABELS[s]}
                </Link>
              ))}
            </div>
          </div>

          {pageProducts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-3 text-slate-300">No products match those filters.</p>
              <Link href="/shop" className="mt-2 inline-block text-sm text-reef-400 hover:text-reef-300">
                Clear everything →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {pageProducts.map((p) => (
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
