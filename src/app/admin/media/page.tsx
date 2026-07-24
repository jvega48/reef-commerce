import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { storageBackend } from "@/lib/storage";
import MediaLibrary from "@/components/admin/MediaLibrary";
import type { Prisma, LivestockType } from "@/generated/prisma/client";

export const metadata = { title: "Media Library — Admin" };

const PAGE_SIZE = 60;

const SORTS: Record<string, Prisma.ProductImageOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  name: [{ product: { name: "asc" } }, { position: "asc" }],
  size: [{ bytes: "desc" }],
};
const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  oldest: "Oldest",
  name: "Product A–Z",
  size: "Largest",
};

const TYPES: LivestockType[] = ["CORAL", "FISH", "INVERTEBRATE", "DRY_GOOD", "MERCH"];

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; type?: string; category?: string; product?: string;
    sort?: string; view?: string; page?: string;
    deleted?: string; reassigned?: string; error?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = sp.sort && SORTS[sp.sort] ? sp.sort : "newest";
  const view = sp.view === "list" ? "list" : "grid";

  // Images have no category of their own — they inherit it from the product
  // that owns them, so every filter here is a filter on that product.
  const productWhere: Prisma.ProductWhereInput = {};
  if (sp.type && (TYPES as string[]).includes(sp.type)) {
    productWhere.livestockType = sp.type as LivestockType;
  }
  if (sp.category) {
    productWhere.categories = { some: { category: { slug: sp.category } } };
  }
  if (sp.product) productWhere.id = sp.product;
  if (sp.q) {
    productWhere.OR = [
      { name: { contains: sp.q, mode: "insensitive" } },
      { sku: { contains: sp.q, mode: "insensitive" } },
      { scientificName: { contains: sp.q, mode: "insensitive" } },
    ];
  }

  const where: Prisma.ProductImageWhereInput =
    Object.keys(productWhere).length > 0 ? { product: productWhere } : {};
  // Alt-text search should also match the image itself.
  if (sp.q) {
    where.OR = [
      { product: productWhere },
      { alt: { contains: sp.q, mode: "insensitive" } },
    ];
    delete (where as { product?: unknown }).product;
  }

  const [images, total, categories, stats] = await Promise.all([
    prisma.productImage.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, livestockType: true,
            categories: { include: { category: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.productImage.count({ where }),
    prisma.category.findMany({
      where: { products: { some: {} } },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
    prisma.productImage.aggregate({ _count: true, _sum: { bytes: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkFor = (overrides: Record<string, string | undefined>) => {
    const merged = { ...sp, page: undefined, deleted: undefined, reassigned: undefined, error: undefined, ...overrides };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, String(v));
    const s = qs.toString();
    return s ? `/admin/media?${s}` : "/admin/media";
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="mt-1 text-sm text-slate-400">
            {stats._count} images
            {stats._sum.bytes ? ` · ${(stats._sum.bytes / 1024 / 1024).toFixed(1)} MB stored` : ""}
            {" · "}
            <span className={storageBackend() === "r2" ? "text-emerald-300" : "text-amber-300"}>
              {storageBackend() === "r2" ? "Cloudflare R2" : "local disk (dev)"}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={linkFor({ view: "grid" })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${view === "grid" ? "bg-reef-500 text-abyss-950" : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"}`}
          >
            ▦ Grid
          </Link>
          <Link
            href={linkFor({ view: "list" })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${view === "list" ? "bg-reef-500 text-abyss-950" : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"}`}
          >
            ☰ List
          </Link>
        </div>
      </div>

      {sp.deleted && (
        <p className="mt-4 rounded-lg border border-reef-500/40 bg-reef-500/10 px-4 py-2 text-sm text-reef-300">
          Deleted {sp.deleted} image(s).
        </p>
      )}
      {sp.reassigned && (
        <p className="mt-4 rounded-lg border border-reef-500/40 bg-reef-500/10 px-4 py-2 text-sm text-reef-300">
          Moved {sp.reassigned} image(s) to the target product.
        </p>
      )}
      {sp.error === "notfound" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          No product with that ID — copy it from the product&apos;s admin URL.
        </p>
      )}

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <form action="/admin/media" className="flex gap-2">
          {sp.type && <input type="hidden" name="type" value={sp.type} />}
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          <input type="hidden" name="view" value={view} />
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search product, SKU, alt text…"
            aria-label="Search media"
            className="w-64 rounded-full border border-abyss-700 bg-abyss-900 px-4 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
          />
        </form>

        <Link
          href={linkFor({ type: undefined })}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!sp.type ? "bg-reef-500 text-abyss-950" : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"}`}
        >
          All types
        </Link>
        {TYPES.map((t) => (
          <Link
            key={t}
            href={linkFor({ type: sp.type === t ? undefined : t })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${sp.type === t ? "bg-reef-500 text-abyss-950" : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"}`}
          >
            {t.replace("_", " ")}
          </Link>
        ))}

        <form action="/admin/media" className="flex gap-1">
          {sp.q && <input type="hidden" name="q" value={sp.q} />}
          {sp.type && <input type="hidden" name="type" value={sp.type} />}
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="sort" value={sort} />
          <select
            name="category"
            defaultValue={sp.category ?? ""}
            aria-label="Filter by category"
            className="rounded-full border border-abyss-700 bg-abyss-900 px-3 py-1.5 text-xs text-slate-200 focus:border-reef-500 focus:outline-none"
          >
            <option value="">All categories…</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <button className="rounded-full bg-abyss-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-abyss-700">
            Go
          </button>
        </form>

        <div className="ml-auto flex gap-2 text-xs text-slate-400">
          {Object.keys(SORTS).map((s) => (
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

      {/* Category quick-links (work without JS) */}
      {sp.category && (
        <p className="mt-2 text-xs text-slate-400">
          Filtered to <span className="text-reef-300">{categories.find((c) => c.slug === sp.category)?.name ?? sp.category}</span>{" "}
          <Link href={linkFor({ category: undefined })} className="text-reef-400 hover:text-reef-300">clear ✕</Link>
        </p>
      )}

      <p className="mt-4 text-sm text-slate-400">
        {total} image{total === 1 ? "" : "s"} match
      </p>

      <div className="mt-3">
        <MediaLibrary
          view={view}
          items={images.map((m) => ({
            id: m.id,
            url: m.url,
            thumbUrl: m.thumbUrl,
            alt: m.alt,
            position: m.position,
            width: m.width,
            height: m.height,
            bytes: m.bytes,
            isVideo: m.isVideo,
            createdAt: m.createdAt.toISOString(),
            productId: m.product.id,
            productName: m.product.name,
            productSlug: m.product.slug,
            livestockType: m.product.livestockType,
            categories: m.product.categories.map((c) => c.category.name).join(", "),
          }))}
        />
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={linkFor({ page: String(page - 1) })} className="rounded bg-abyss-800 px-3 py-1.5 hover:bg-abyss-700">
              ← Prev
            </Link>
          )}
          <span className="px-3 py-1.5 text-slate-400">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={linkFor({ page: String(page + 1) })} className="rounded bg-abyss-800 px-3 py-1.5 hover:bg-abyss-700">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
