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
      <h1 className="text-2xl font-bold">Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-6 text-slate-400">
          No orders yet. Orders will appear here once Stripe checkout is configured and live.
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
                  <td className="px-4 py-2 font-semibold">#{o.orderNumber}</td>
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
