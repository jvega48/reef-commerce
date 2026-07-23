import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, ProductStatus } from "@/generated/prisma/client";
import { formatPrice } from "@/components/ProductCard";

const PAGE_SIZE = 50;
const STATUSES = ["ALL", "ACTIVE", "DRAFT", "ARCHIVED", "SOLD"] as const;

export const metadata = { title: "Products — Admin" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
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
      </div>

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

      <div className="mt-5 overflow-x-auto rounded-xl border border-abyss-700/60">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-abyss-800 bg-abyss-950">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-abyss-900">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-abyss-800">
                      {p.images[0] && (
                        <Image
                          src={p.images[0].url}
                          alt={p.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/product/${p.slug}`}
                        className="block truncate font-medium text-slate-200 hover:text-reef-300"
                      >
                        {p.name}
                      </Link>
                      <p className="truncate text-xs text-slate-500">
                        {p.categories.map((c) => c.category.name).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-400">{p.sku}</td>
                <td className="px-4 py-2 text-slate-300">{p.livestockType}</td>
                <td className="px-4 py-2">
                  {p.inventoryMode === "WYSIWYG" ? (
                    <span className="rounded bg-reef-500/20 px-1.5 py-0.5 text-xs font-semibold text-reef-300">
                      WYSIWYG
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Standard</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                      p.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : p.status === "DRAFT"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td
                  className={`px-4 py-2 text-right ${
                    p.quantity === 0 ? "text-coral-400" : "text-slate-200"
                  }`}
                >
                  {p.quantity}
                </td>
                <td className="px-4 py-2 text-right font-medium text-reef-300">
                  {formatPrice(p.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
