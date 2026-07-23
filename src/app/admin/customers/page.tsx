import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Customers — Admin" };

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { orders: { where: { status: { notIn: ["CANCELLED", "REFUNDED"] } } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Customers</h1>
      {customers.length === 0 ? (
        <p className="mt-6 text-slate-400">
          No customer accounts yet. Customers appear here after registering on the storefront.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-abyss-700/60">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Lifetime Value</th>
                <th className="px-4 py-3 text-right">Reef Points</th>
                <th className="px-4 py-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abyss-800 bg-abyss-950">
              {customers.map((c) => {
                const ltv = c.orders.reduce((sum, o) => sum + Number(o.total), 0);
                return (
                  <tr key={c.id} className="hover:bg-abyss-900">
                    <td className="px-4 py-2 font-medium text-slate-200">{c.name ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-300">{c.email}</td>
                    <td className="px-4 py-2 text-right">{c.orders.length}</td>
                    <td className="px-4 py-2 text-right font-medium text-reef-300">
                      {formatPrice(ltv)}
                    </td>
                    <td className="px-4 py-2 text-right">{c.reefPoints}</td>
                    <td className="px-4 py-2 text-right text-slate-400">
                      {c.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
