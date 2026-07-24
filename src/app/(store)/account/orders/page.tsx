import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";
import { ORDER_STATUS_LABELS } from "@/lib/tracking";

export const metadata = { title: "Order History" };

export default async function OrderHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: {
      OR: [{ userId: session.user.id }, { email: session.user.email ?? "" }],
    },
    orderBy: { createdAt: "desc" },
    include: { items: true, shipments: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Order History</h1>
      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-10 text-center">
          <p className="text-4xl">🪸</p>
          <p className="mt-3 text-slate-300">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Explore the reef →
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="block rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 transition hover:border-reef-500/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <p className="font-bold">Order #{o.orderNumber}</p>
                  <span className="rounded-full bg-abyss-800 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-reef-300">
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{o.createdAt.toLocaleDateString()}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {o.items.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-abyss-800"
                  >
                    {item.imageUrl && (
                      <Image src={item.imageUrl} alt={item.name} fill sizes="48px" className="object-cover" />
                    )}
                  </div>
                ))}
                {o.items.length > 6 && (
                  <span className="text-xs text-slate-500">+{o.items.length - 6} more</span>
                )}
                <span className="ml-auto font-bold text-reef-300">{formatPrice(o.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
