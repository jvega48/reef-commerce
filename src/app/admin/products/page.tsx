import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, ProductStatus } from "@/generated/prisma/client";
import BulkProductTable from "@/components/admin/BulkProductTable";

const PAGE_SIZE = 50;
const STATUSES = ["ALL", "ACTIVE", "DRAFT", "ARCHIVED", "SOLD"] as const;

export const metadata = { title: "Products — Admin" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; bulk?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? params.status
    : "ALL";

  const where: Prisma.ProductWhereInput = {};
  if (status !== "ALL") where.status = status as ProductStatus;
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { sku: { contains: params.q, mode: "insensitive" } },
      { scientificName: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { take: 1, orderBy: { position: "asc" } },
        categories: { include: { category: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const linkFor = (overrides: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    const merged = { q: params.q, status: params.status, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "ALL") qs.set(k, v);
    const s = qs.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-slate-400">{total} products</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export?what=products"
            className="rounded-full border border-abyss-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-reef-500/50 hover:text-reef-300"
          >
            ⬇ Export
          </a>
          <Link
            href="/admin/products/import"
            className="rounded-full border border-abyss-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-reef-500/50 hover:text-reef-300"
          >
            ⬆ Import
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600"
          >
            + New Product
          </Link>
        </div>
      </div>

      {params.bulk === "done" && (
        <p className="mt-4 rounded-lg border border-reef-500/40 bg-reef-500/10 px-4 py-2 text-sm text-reef-300">
          Bulk update applied.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={linkFor({ status: s, page: undefined })}
            className={`rounded-full px-3 py-1 text-sm ${
              status === s
                ? "bg-reef-500 font-semibold text-abyss-950"
                : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"
            }`}
          >
            {s}
          </Link>
        ))}
        <form action="/admin/products" className="ml-auto">
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search name, SKU…"
            className="w-64 rounded-full border border-abyss-700 bg-abyss-900 px-4 py-1.5 text-sm placeholder:text-slate-500 focus:border-reef-500 focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-5">
        <BulkProductTable
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            slug: p.slug,
            livestockType: p.livestockType,
            inventoryMode: p.inventoryMode,
            status: p.status,
            quantity: p.quantity,
            price: Number(p.price),
            categories: p.categories.map((c) => c.category.name).join(", "),
            image: p.images[0]?.url ?? null,
          }))}
        />
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={linkFor({ page: String(page - 1) })}
              className="rounded bg-abyss-800 px-3 py-1.5 hover:bg-abyss-700"
            >
              ← Prev
            </Link>
          )}
          <span className="px-3 py-1.5 text-slate-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={linkFor({ page: String(page + 1) })}
              className="rounded bg-abyss-800 px-3 py-1.5 hover:bg-abyss-700"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
