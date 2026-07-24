import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Analytics — Admin" };

// Revenue = non-cancelled, non-pending orders (money actually captured or
// owed), by calendar day. Chart colors validated against the admin surface:
// bars #0d92a3 (series 1), #e55220 (series 2) — dataviz six-checks pass.

const PAID_STATUSES = [
  "PAID", "PACKING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "PARTIALLY_REFUNDED",
] as const;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AnalyticsPage() {
  const now = new Date();
  const days = 30;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);

  const [recentOrders, monthAgg, refundAgg, newCustomers30d, topProducts, topCustomers, monthlyOrders, giftCardLiability] =
    await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start }, status: { in: [...PAID_STATUSES] } },
        select: { total: true, createdAt: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart }, status: { in: [...PAID_STATUSES] } },
        _sum: { total: true },
        _count: true,
        _avg: { total: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { refundAmount: true },
      }),
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: start } },
      }),
      prisma.orderItem.groupBy({
        by: ["productId", "name"],
        where: {
          order: { createdAt: { gte: start }, status: { in: [...PAID_STATUSES] } },
          productId: { not: null },
        },
        _sum: { quantity: true },
        _count: true,
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
      prisma.order.groupBy({
        by: ["email"],
        where: { status: { in: [...PAID_STATUSES] } },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: yearStart }, status: { in: [...PAID_STATUSES] } },
        select: { total: true, createdAt: true },
      }),
      prisma.giftCard.aggregate({
        where: { active: true },
        _sum: { balance: true },
      }),
    ]);

  // Daily revenue series (fill gaps with zero)
  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    byDay.set(dayKey(d), 0);
  }
  for (const o of recentOrders) {
    const k = dayKey(o.createdAt);
    byDay.set(k, (byDay.get(k) ?? 0) + Number(o.total));
  }
  const daily = [...byDay.entries()].map(([date, revenue]) => ({ date, revenue }));
  const maxDaily = Math.max(1, ...daily.map((d) => d.revenue));
  const rev30 = daily.reduce((s, d) => s + d.revenue, 0);
  const maxIdx = daily.findIndex((d) => d.revenue === maxDaily);

  // Monthly revenue series (last 13 months incl. current)
  const byMonth = new Map<string, number>();
  for (const o of monthlyOrders) {
    const k = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(k, (byMonth.get(k) ?? 0) + Number(o.total));
  }
  const monthly = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  const maxMonthly = Math.max(1, ...monthly.map(([, v]) => v));

  const tiles: [string, string, string?][] = [
    ["Revenue (30d)", formatPrice(rev30)],
    ["Revenue (this month)", formatPrice(monthAgg._sum.total ?? 0)],
    ["Orders (this month)", String(monthAgg._count)],
    ["Avg order value", formatPrice(monthAgg._avg.total ?? 0)],
    ["Refunds (this month)", formatPrice(refundAgg._sum.refundAmount ?? 0)],
    ["New customers (30d)", String(newCustomers30d)],
    ["Gift card liability", formatPrice(giftCardLiability._sum.balance ?? 0), "outstanding balances"],
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2 text-sm">
          {(["orders", "products", "customers"] as const).map((what) => (
            <a
              key={what}
              href={`/api/admin/export?what=${what}`}
              className="rounded-full border border-abyss-700 px-4 py-1.5 font-semibold text-slate-300 transition hover:border-reef-500/50 hover:text-reef-300"
            >
              ⬇ {what[0].toUpperCase() + what.slice(1)} CSV
            </a>
          ))}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-4">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-100">{value}</p>
            {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
          </div>
        ))}
      </div>

      {/* Daily revenue bar chart */}
      <section className="mt-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="font-semibold text-slate-200">Revenue — last 30 days</h2>
        <div
          className="mt-4 flex h-44 items-end gap-[2px]"
          role="img"
          aria-label={`Daily revenue for the last 30 days, peaking at ${formatPrice(maxDaily)}`}
        >
          {daily.map((d, i) => {
            const h = Math.max(2, Math.round((d.revenue / maxDaily) * 160));
            const showLabel = i === maxIdx || i === daily.length - 1;
            return (
              <div key={d.date} className="group relative flex-1" style={{ height: 176 }}>
                {showLabel && d.revenue > 0 && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-slate-300">
                    {formatPrice(d.revenue)}
                  </span>
                )}
                <div
                  title={`${d.date}: ${formatPrice(d.revenue)}`}
                  className="absolute bottom-0 w-full rounded-t-[4px] bg-[#0d92a3] transition group-hover:bg-[#14b5c8]"
                  style={{ height: h }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>{daily[0].date}</span>
          <span>{daily[daily.length - 1].date}</span>
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-slate-400 hover:text-reef-300">
            View data table
          </summary>
          <table className="mt-2 w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr><th className="py-1 pr-4">Date</th><th className="py-1 text-right">Revenue</th></tr>
            </thead>
            <tbody className="text-slate-300">
              {daily.filter((d) => d.revenue > 0).map((d) => (
                <tr key={d.date} className="border-t border-abyss-800">
                  <td className="py-1 pr-4">{d.date}</td>
                  <td className="py-1 text-right">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      {/* Monthly revenue */}
      {monthly.length > 1 && (
        <section className="mt-6 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <h2 className="font-semibold text-slate-200">Revenue by month</h2>
          <div className="mt-4 flex h-36 items-end gap-2" role="img" aria-label="Monthly revenue">
            {monthly.map(([month, v]) => (
              <div key={month} className="group relative flex-1" style={{ height: 144 }}>
                <div
                  title={`${month}: ${formatPrice(v)}`}
                  className="absolute bottom-0 w-full rounded-t-[4px] bg-[#e55220] transition group-hover:bg-[#ff6b35]"
                  style={{ height: Math.max(2, Math.round((v / maxMonthly) * 120)) }}
                />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">
                  {month.slice(2).replace("-", "/")}
                </span>
              </div>
            ))}
          </div>
          <div className="h-5" />
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900">
          <h2 className="border-b border-abyss-800 px-5 py-3 font-semibold text-slate-200">
            Top products (30d, by units)
          </h2>
          {topProducts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No sales in the window yet.</p>
          ) : (
            <div className="divide-y divide-abyss-800 text-sm">
              {topProducts.map((p, i) => (
                <div key={`${p.productId}`} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-5 text-xs font-bold text-slate-500">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-300">{p.name}</span>
                  <span className="text-slate-400">{p._sum.quantity} sold</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top customers */}
        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900">
          <h2 className="border-b border-abyss-800 px-5 py-3 font-semibold text-slate-200">
            Top customers (lifetime)
          </h2>
          {topCustomers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No customers yet.</p>
          ) : (
            <div className="divide-y divide-abyss-800 text-sm">
              {topCustomers.map((c, i) => (
                <div key={c.email} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-5 text-xs font-bold text-slate-500">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-300">{c.email}</span>
                  <span className="text-xs text-slate-500">{c._count} orders</span>
                  <span className="font-semibold text-reef-300">
                    {formatPrice(c._sum.total ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Inventory alerts live on the <Link href="/admin" className="text-reef-400">dashboard</Link>.
        Revenue counts paid, packing, shipped, delivered, and partially-refunded orders;
        refunds are tracked separately.
      </p>
    </div>
  );
}
