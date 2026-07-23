import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CART_COOKIE } from "@/lib/cart";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Order Confirmed" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  if (!orderId) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, shippingAddress: true },
  });
  if (!order) notFound();

  // Payment done (or processing) — retire this cart so it doesn't linger.
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (cartId) {
    await prisma.cart.deleteMany({ where: { id: cartId } });
  }

  const paid = order.status !== "PENDING";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="text-6xl">{paid ? "🎉" : "⏳"}</div>
      <h1 className="mt-4 text-3xl font-bold">
        {paid ? "Order confirmed!" : "Finishing up your payment…"}
      </h1>
      <p className="mt-2 text-slate-400">
        {paid ? (
          <>
            Thanks for your order — a confirmation is on its way to{" "}
            <span className="text-slate-200">{order.email}</span>.
          </>
        ) : (
          "Your payment is processing. This page will show your confirmed order shortly — refresh in a moment."
        )}
      </p>

      <div className="mt-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6 text-left">
        <div className="flex items-baseline justify-between border-b border-abyss-800 pb-3">
          <p className="font-[family-name:var(--font-display)] text-lg font-bold">
            Order #{order.orderNumber}
          </p>
          <p className="text-sm text-slate-400">{order.createdAt.toLocaleDateString()}</p>
        </div>
        <div className="mt-4 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-abyss-800">
                {item.imageUrl && (
                  <Image src={item.imageUrl} alt={item.name} fill sizes="48px" className="object-cover" />
                )}
              </div>
              <p className="min-w-0 flex-1 truncate text-slate-300">{item.name}</p>
              <p className="text-slate-400">×{item.quantity}</p>
              <p className="w-20 text-right font-medium text-slate-200">
                {formatPrice(Number(item.unitPrice) * item.quantity)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-abyss-800 pt-3 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Shipping</span>
            <span>{Number(order.shippingCost) === 0 ? "FREE" : formatPrice(order.shippingCost)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span className="text-reef-300">{formatPrice(order.total)}</span>
          </div>
        </div>
        {order.shippingAddress ? (
          <p className="mt-4 border-t border-abyss-800 pt-3 text-sm text-slate-400">
            Shipping overnight to{" "}
            <span className="text-slate-200">
              {order.shippingAddress.name}, {order.shippingAddress.city},{" "}
              {order.shippingAddress.state}
            </span>
            . You&apos;ll get tracking as soon as the label prints.
          </p>
        ) : (
          <p className="mt-4 border-t border-abyss-800 pt-3 text-sm text-slate-400">
            Local pickup — we&apos;ll email you when your order is ready.
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/shop"
          className="rounded-full bg-coral-500 px-6 py-3 font-semibold text-white transition hover:bg-coral-600"
        >
          Keep Shopping
        </Link>
        <Link
          href="/account"
          className="rounded-full border border-abyss-700 px-6 py-3 font-semibold text-slate-300 transition hover:bg-abyss-800"
        >
          View My Orders
        </Link>
      </div>
    </div>
  );
}
