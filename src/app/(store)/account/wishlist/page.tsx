import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toggleWishlist } from "@/lib/account-actions";
import ProductCard from "@/components/ProductCard";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Wishlist</h1>
      <p className="mt-1 text-sm text-slate-400">
        {items.length} saved {items.length === 1 ? "item" : "items"} — we&apos;ll keep them
        here across devices.
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-10 text-center">
          <p className="text-4xl">🤍</p>
          <p className="mt-3 text-slate-300">Nothing saved yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Tap the heart on any product to keep an eye on it.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Browse the reef →
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((w) => (
            <div key={w.id} className="group relative">
              <ProductCard product={w.product} />
              <form action={toggleWishlist} className="absolute right-2.5 top-2.5">
                <input type="hidden" name="productId" value={w.productId} />
                <button
                  aria-label={`Remove ${w.product.name} from wishlist`}
                  title="Remove from wishlist"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-abyss-950/80 text-coral-400 backdrop-blur transition hover:bg-coral-500 hover:text-white"
                >
                  ♥
                </button>
              </form>
              {w.product.status !== "ACTIVE" || w.product.quantity < 1 ? (
                <p className="mt-1.5 text-center text-xs text-coral-300">
                  Currently unavailable
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
