import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Orders — Admin" };

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: true, user: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link
          href="/admin/orders/new"
          className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600"
        >
          + Create Order
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="mt-6 text-slate-400">
          No orders yet. Create one manually above, or they&apos;ll arrive automatically once
          Stripe checkout is live.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-abyss-700/60">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abyss-800 bg-abyss-950">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-abyss-900">
                  <td className="px-4 py-2 font-semibold">
                    <Link href={`/admin/orders/${o.id}`} className="text-reef-300 hover:text-reef-200">
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-300">{o.user?.name ?? o.email}</td>
                  <td className="px-4 py-2 text-xs uppercase text-slate-400">{o.status}</td>
                  <td className="px-4 py-2 text-right">{o.items.length}</td>
                  <td className="px-4 py-2 text-right font-medium text-reef-300">
                    {formatPrice(o.total)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-400">
                    {o.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
