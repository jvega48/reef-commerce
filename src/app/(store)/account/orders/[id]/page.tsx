import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";
import { FULFILLMENT_STEPS, ORDER_STATUS_LABELS, trackingUrl } from "@/lib/tracking";

export const metadata = { title: "Order Details" };

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shippingAddress: true,
      shipments: { orderBy: { createdAt: "desc" } },
      events: {
        where: { visibleToCustomer: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!order) notFound();
  const isOwner =
    order.userId === session.user.id ||
    order.email.toLowerCase() === session.user.email?.toLowerCase();
  if (!isOwner) notFound();

  const stepIndex = FULFILLMENT_STEPS.indexOf(
    order.status as (typeof FULFILLMENT_STEPS)[number],
  );
  const isTerminated = ["CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(order.status);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Placed {order.createdAt.toLocaleDateString()} ·{" "}
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/orders/${order.id}/pdf?doc=invoice`}
            className="rounded-full border border-abyss-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-reef-500/50 hover:text-reef-300"
          >
            ⬇ Invoice
          </a>
          <a
            href={`/api/orders/${order.id}/pdf?doc=${order.isGift ? "gift-receipt" : "receipt"}`}
            className="rounded-full border border-abyss-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-reef-500/50 hover:text-reef-300"
          >
            ⬇ {order.isGift ? "Gift Receipt" : "Receipt"}
          </a>
          {Number(order.refundAmount) > 0 && (
            <a
              href={`/api/orders/${order.id}/pdf?doc=refund-receipt`}
              className="rounded-full border border-abyss-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-reef-500/50 hover:text-reef-300"
            >
              ⬇ Refund Receipt
            </a>
          )}
        </div>
      </div>

      {/* Fulfillment progress */}
      {!isTerminated && (
        <div className="mt-6 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <ol className="flex items-center" aria-label="Order progress">
            {FULFILLMENT_STEPS.map((step, i) => {
              const reached = stepIndex >= i || order.status === "DELIVERED";
              const active = stepIndex === i;
              return (
                <li key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        reached
                          ? "bg-reef-500 text-abyss-950"
                          : "border border-abyss-700 bg-abyss-950 text-slate-500"
                      } ${active ? "ring-4 ring-reef-500/20" : ""}`}
                    >
                      {reached ? "✓" : i + 1}
                    </span>
                    <span
                      className={`mt-1.5 hidden text-[11px] font-medium sm:block ${
                        reached ? "text-reef-300" : "text-slate-500"
                      }`}
                    >
                      {ORDER_STATUS_LABELS[step]}
                    </span>
                  </div>
                  {i < FULFILLMENT_STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 ${
                        stepIndex > i ? "bg-reef-500" : "bg-abyss-700"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {isTerminated && (
        <div className="mt-6 rounded-2xl border border-coral-500/40 bg-coral-500/10 p-5 text-sm text-coral-200">
          This order was {ORDER_STATUS_LABELS[order.status]?.toLowerCase()}.
          {Number(order.refundAmount) > 0 &&
            ` ${formatPrice(order.refundAmount)} has been refunded to your payment method.`}{" "}
          Questions? <Link href="/account/support" className="underline">Open a support ticket</Link>.
        </div>
      )}

      {/* Tracking */}
      {order.shipments.some((s) => !s.voidedAt) && (
        <section className="mt-6 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <h2 className="font-semibold text-slate-200">Tracking</h2>
          <div className="mt-3 space-y-2">
            {order.shipments.filter((s) => !s.voidedAt).map((s) => {
              const url = s.trackingUrl ?? trackingUrl(s.carrier, s.trackingNumber);
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-abyss-700 bg-abyss-950 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-200">
                      {s.carrier} {s.service && `· ${s.service}`}
                    </p>
                    <p className="font-mono text-xs text-reef-300">{s.trackingNumber}</p>
                  </div>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-reef-500 px-4 py-1.5 text-xs font-bold text-abyss-950 transition hover:bg-reef-400"
                    >
                      Track package ↗
                    </a>
                  ) : (
                    <span className="text-xs uppercase text-slate-400">
                      {s.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            🎥 Reminder: film your unboxing within 2 hours of delivery — it&apos;s required
            for live-arrival guarantee claims.
          </p>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Items */}
        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 md:col-span-2">
          <h2 className="border-b border-abyss-800 px-5 py-3 font-semibold text-slate-200">Items</h2>
          <div className="divide-y divide-abyss-800">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-abyss-800">
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt={item.name} fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-slate-200">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.sku}</p>
                </div>
                <span className="text-slate-400">
                  {item.quantity} × {formatPrice(item.unitPrice)}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-1 border-t border-abyss-800 px-5 py-4 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-coral-300">
                <span>Discount</span><span>−{formatPrice(order.discount)}</span>
              </div>
            )}
            {Number(order.giftCardAmount) > 0 && (
              <div className="flex justify-between text-coral-300">
                <span>Gift card</span><span>−{formatPrice(order.giftCardAmount)}</span>
              </div>
            )}
            {order.pointsRedeemed > 0 && (
              <div className="flex justify-between text-coral-300">
                <span>Reef Points</span><span>−{formatPrice(order.pointsRedeemed / 100)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Shipping</span>
              <span>{Number(order.shippingCost) === 0 ? "FREE" : formatPrice(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tax</span><span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between border-t border-abyss-800 pt-2 text-base font-bold">
              <span>Total</span>
              <span className="text-reef-300">{formatPrice(order.total)}</span>
            </div>
          </div>
        </section>

        {/* Timeline + address */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-sm">
            <h2 className="mb-3 font-semibold text-slate-200">Shipping To</h2>
            {order.shippingAddress ? (
              <address className="not-italic leading-relaxed text-slate-300">
                {order.shippingAddress.name}<br />
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
              </address>
            ) : (
              <p className="text-slate-400">Local pickup</p>
            )}
          </section>

          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-3 font-semibold text-slate-200">History</h2>
            {order.events.length === 0 ? (
              <p className="text-sm text-slate-500">No updates yet.</p>
            ) : (
              <ol className="space-y-3 border-l border-abyss-700 pl-4 text-sm">
                {order.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-reef-400" />
                    <p className="text-slate-300">{e.message}</p>
                    <p className="text-xs text-slate-500">{e.createdAt.toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <Link
            href={`/account/support?order=${order.id}`}
            className="block rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-sm text-slate-300 transition hover:border-reef-500/50"
          >
            <p className="font-semibold text-slate-200">Need help with this order?</p>
            <p className="mt-1 text-slate-400">
              Open a support ticket and we&apos;ll jump on it. →
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
