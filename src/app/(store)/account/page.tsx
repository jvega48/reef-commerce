import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRecentlyViewedProducts } from "@/lib/recently-viewed";
import ProductCard, { formatPrice } from "@/components/ProductCard";
import { ORDER_STATUS_LABELS } from "@/lib/tracking";

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, recentlyViewed] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 3, include: { items: true } },
        wishlistItems: {
          orderBy: { createdAt: "desc" },
          take: 4,
          include: {
            product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
          },
        },
        _count: { select: { orders: true, wishlistItems: true } },
      },
    }),
    getRecentlyViewedProducts(undefined, 4),
  ]);
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-3xl font-bold">Hey, {user.name?.split(" ")[0] ?? "reefer"} 👋</h1>
      <p className="mt-1 text-slate-400">{user.email}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/account/rewards"
          className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-5 transition hover:border-reef-500/50"
        >
          <p className="text-sm text-slate-400">Reef Points</p>
          <p className="mt-1 text-2xl font-bold text-reef-300">
            {user.reefPoints.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">≈ {formatPrice(user.reefPoints / 100)} in rewards</p>
        </Link>
        <div className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-5">
          <p className="text-sm text-slate-400">Store Credit</p>
          <p className="mt-1 text-2xl font-bold text-reef-300">{formatPrice(user.storeCredit)}</p>
        </div>
        <div className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-5">
          <p className="text-sm text-slate-400">Orders</p>
          <p className="mt-1 text-2xl font-bold text-coral-400">{user._count.orders}</p>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent Orders</h2>
          {user._count.orders > 0 && (
            <Link href="/account/orders" className="text-sm text-reef-400 hover:text-reef-300">
              View all →
            </Link>
          )}
        </div>
        {user.orders.length === 0 ? (
          <p className="mt-3 text-slate-400">
            No orders yet.{" "}
            <Link href="/shop" className="text-reef-400 hover:text-reef-300">
              Start shopping →
            </Link>
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {user.orders.map((o) => (
              <Link
                key={o.id}
                href={`/account/orders/${o.id}`}
                className="flex items-center justify-between rounded-xl border border-abyss-700/60 bg-abyss-900 p-4 text-sm transition hover:border-reef-500/50"
              >
                <div>
                  <p className="font-semibold">Order #{o.orderNumber}</p>
                  <p className="text-slate-400">
                    {o.createdAt.toLocaleDateString()} ·{" "}
                    {o.items.reduce((n, i) => n + i.quantity, 0)} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-reef-300">{formatPrice(o.total)}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {user.wishlistItems.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Wishlist</h2>
            <Link href="/account/wishlist" className="text-sm text-reef-400 hover:text-reef-300">
              View all ({user._count.wishlistItems}) →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {user.wishlistItems.map((w) => (
              <ProductCard key={w.id} product={w.product} />
            ))}
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Recently Viewed</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentlyViewed.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
