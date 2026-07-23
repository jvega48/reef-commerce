import Image from "next/image";
import Link from "next/link";
import { getCart } from "@/lib/cart";
import { removeCartItem, updateCartItem } from "@/lib/cart-actions";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Cart" };

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; name?: string }>;
}) {
  const { error, name } = await searchParams;
  const cart = await getCart();
  const items = cart?.items ?? [];
  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0,
  );

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="text-5xl">🛒</div>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-slate-400">Find your next centerpiece coral.</p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-coral-500 px-6 py-3 font-semibold text-white hover:bg-coral-600"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Cart</h1>
      {error === "stock" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          {name ? `"${name}"` : "An item"} sold out or doesn&apos;t have enough stock — adjust
          your cart to continue.
        </p>
      )}
      <div className="mt-6 space-y-4">
        {items.map((item) => {
          const img = item.product.images[0];
          const isWysiwyg = item.product.inventoryMode === "WYSIWYG";
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-xl border border-abyss-700/60 bg-abyss-900 p-4"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-abyss-800">
                {img && (
                  <Image src={img.url} alt={item.product.name} fill sizes="80px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.product.slug}`}
                  className="font-medium text-slate-200 hover:text-reef-300"
                >
                  {item.product.name}
                </Link>
                <p className="text-sm text-slate-400">
                  {formatPrice(item.product.price)}
                  {isWysiwyg && (
                    <span className="ml-2 rounded bg-reef-500/20 px-1.5 py-0.5 text-xs font-semibold text-reef-300">
                      WYSIWYG
                    </span>
                  )}
                </p>
              </div>
              {!isWysiwyg && (
                <form action={updateCartItem} className="flex items-center gap-2">
                  <input type="hidden" name="itemId" value={item.id} />
                  <input
                    type="number"
                    name="quantity"
                    min={1}
                    max={item.product.quantity}
                    defaultValue={item.quantity}
                    className="w-16 rounded-lg border border-abyss-700 bg-abyss-950 px-2 py-1.5 text-center text-sm"
                  />
                  <button type="submit" className="text-sm text-reef-400 hover:text-reef-300">
                    Update
                  </button>
                </form>
              )}
              <p className="w-20 text-right font-semibold text-reef-300">
                {formatPrice(Number(item.product.price) * item.quantity)}
              </p>
              <form action={removeCartItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <button type="submit" className="text-slate-500 hover:text-coral-400" aria-label="Remove">
                  ✕
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-end gap-3">
        <p className="text-lg">
          Subtotal: <span className="font-bold text-reef-300">{formatPrice(subtotal)}</span>
        </p>
        <p className="text-sm text-slate-500">Shipping and tax calculated at checkout.</p>
        <Link
          href="/checkout"
          className="rounded-full bg-coral-500 px-10 py-3.5 font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600"
        >
          Proceed to Checkout →
        </Link>
      </div>
    </div>
  );
}
