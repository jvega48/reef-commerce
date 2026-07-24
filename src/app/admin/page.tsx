import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalProducts,
    activeProducts,
    draftProducts,
    outOfStock,
    lowStock,
    wysiwygCount,
    customerCount,
    ordersToday,
    pendingOrders,
    revenueMonth,
    inventoryValue,
    recentProducts,
    lowStockList,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "DRAFT" } }),
    prisma.product.count({ where: { status: "ACTIVE", quantity: 0 } }),
    prisma.product.count({
      where: { status: "ACTIVE", quantity: { gt: 0, lte: 2 } },
    }),
    prisma.product.count({ where: { inventoryMode: "WYSIWYG" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.order.count({
      where: { status: { in: ["PAID", "PACKING", "READY_TO_SHIP"] } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: monthStart }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    }),
    prisma.product.aggregate({
      _sum: { price: true },
      where: { status: "ACTIVE", quantity: { gt: 0 } },
    }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { images: { take: 1, orderBy: { position: "asc" } } },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", quantity: { gt: 0, lte: 2 }, inventoryMode: "STANDARD" },
      orderBy: { quantity: "asc" },
      take: 8,
    }),
  ]);

  const stats: [string, string | number, string?][] = [
    ["Orders Today", ordersToday],
    ["Pending Orders", pendingOrders],
    ["Revenue (Month)", formatPrice(revenueMonth._sum.total ?? 0)],
    ["Customers", customerCount],
    ["Active Products", activeProducts],
    ["Drafts", draftProducts, "need price/photos before publishing"],
    ["Out of Stock", outOfStock],
    ["Low Stock", lowStock],
    ["WYSIWYG Listings", wysiwygCount],
    ["Inventory Value", formatPrice(inventoryValue._sum.price ?? 0), "sum of active in-stock prices"],
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        {totalProducts} products imported from aquavida365.com
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-reef-300">{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">Recently Added</h2>
            <Link href="/admin/products" className="text-sm text-reef-400 hover:text-reef-300">
              All products →
            </Link>
          </div>
          <div className="divide-y divide-abyss-800 rounded-xl border border-abyss-700/60 bg-abyss-900">
            {recentProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="truncate text-slate-200">{p.name}</span>
                <span className="ml-4 shrink-0 font-medium text-reef-300">
                  {formatPrice(p.price)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Low Stock Alerts</h2>
          {lowStockList.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing running low. 🎉</p>
          ) : (
            <div className="divide-y divide-abyss-800 rounded-xl border border-abyss-700/60 bg-abyss-900">
              {lowStockList.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="truncate text-slate-200">{p.name}</span>
                  <span className="ml-4 shrink-0 rounded bg-coral-500/20 px-2 py-0.5 font-semibold text-coral-300">
                    {p.quantity} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
