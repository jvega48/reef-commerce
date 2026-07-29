import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  addShipment,
  cancelOrder,
  buyShippoLabel,
  markDelivered,
  refundOrder,
  resendOrderConfirmation,
  saveOrderNotes,
  updateOrderStatus,
  validateOrderAddress,
  voidShippoLabel,
} from "@/lib/order-actions";
import { shippoConfigured } from "@/lib/shippo";
import { trackingUrl, ORDER_STATUS_LABELS } from "@/lib/tracking";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Order — Admin" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-300",
  PAID: "bg-emerald-500/20 text-emerald-300",
  PACKING: "bg-reef-500/20 text-reef-300",
  READY_TO_SHIP: "bg-violet-500/20 text-violet-300",
  SHIPPED: "bg-blue-500/20 text-blue-300",
  DELIVERED: "bg-emerald-500/20 text-emerald-300",
  CANCELLED: "bg-slate-500/20 text-slate-300",
  REFUNDED: "bg-coral-500/20 text-coral-300",
  PARTIALLY_REFUNDED: "bg-coral-500/20 text-coral-300",
};

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const shipError = one(sp.shipError);
  const shipOk = one(sp.shipOk);
  const addr = one(sp.addr);
  const addrMsg = one(sp.addrMsg);
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: true,
      coupon: true,
      giftCard: true,
      shippingAddress: true,
      shipments: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
      tickets: { select: { id: true, number: true, subject: true, status: true } },
    },
  });
  if (!order) notFound();

  const refundable = Number(order.total) - Number(order.refundAmount);
  const cancellable = !["CANCELLED", "REFUNDED", "SHIPPED", "DELIVERED"].includes(
    order.status,
  );

  const hasShippoLabel = order.shipments.some(
    (s) => s.shippoTransactionId && !s.voidedAt,
  );

  return (
    <div className="max-w-5xl">
      {shipError && (
        <div className="mb-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-200">
          ⚠ {shipError}
        </div>
      )}
      {shipOk && (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {shipOk === "voided" ? "✓ Label voided." : "✓ Shipping label created — tracking saved and customer emailed."}
        </div>
      )}
      {addr && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            addr === "valid"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          {addr === "valid" ? "✓ Address validated by Shippo." : "⚠ Address may be invalid."}
          {addrMsg ? ` ${addrMsg}` : ""}
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_COLORS[order.status] ?? ""}`}
            >
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </span>
            {order.isGift && (
              <span className="rounded-full bg-coral-500/20 px-2.5 py-0.5 text-xs font-bold text-coral-300">
                🎁 GIFT
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {order.createdAt.toLocaleString()} · {order.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/orders/${order.id}/packing-slip`}
            className="rounded-full border border-reef-500/50 px-4 py-2 text-sm font-semibold text-reef-300 transition hover:bg-reef-500 hover:text-abyss-950"
          >
            🖨 Packing Slip
          </Link>
          <a
            href={`/api/orders/${order.id}/pdf?doc=invoice`}
            className="rounded-full border border-abyss-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-abyss-800"
          >
            Invoice PDF
          </a>
          <a
            href={`/api/orders/${order.id}/pdf?doc=${order.isGift ? "gift-receipt" : "receipt"}`}
            className="rounded-full border border-abyss-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-abyss-800"
          >
            {order.isGift ? "Gift Receipt" : "Receipt"} PDF
          </a>
          {Number(order.refundAmount) > 0 && (
            <a
              href={`/api/orders/${order.id}/pdf?doc=refund-receipt`}
              className="rounded-full border border-abyss-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-abyss-800"
            >
              Refund Receipt PDF
            </a>
          )}
          <form action={resendOrderConfirmation}>
            <input type="hidden" name="orderId" value={order.id} />
            <button
              type="submit"
              className="rounded-full border border-abyss-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-abyss-800"
              title={`Re-send the confirmation email to ${order.email}`}
            >
              ✉ Resend Invoice Email
            </button>
          </form>
          {shippoConfigured() && order.shippingAddressId && !hasShippoLabel && (
            <>
              <form action={buyShippoLabel}>
                <input type="hidden" name="orderId" value={order.id} />
                <button
                  type="submit"
                  className="rounded-full border border-reef-500 bg-reef-500/10 px-4 py-2 text-sm font-semibold text-reef-200 transition hover:bg-reef-500 hover:text-abyss-950"
                  title="Buy a Shippo label (rate → label → tracking → email customer)"
                >
                  🏷 Buy Shippo Label
                </button>
              </form>
              <form action={validateOrderAddress}>
                <input type="hidden" name="orderId" value={order.id} />
                <button
                  type="submit"
                  className="rounded-full border border-abyss-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-abyss-800"
                  title="Validate the shipping address with Shippo"
                >
                  ✓ Validate Address
                </button>
              </form>
            </>
          )}
          <Link href="/admin/orders" className="text-sm text-slate-400 hover:text-reef-300">
            ← All orders
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: items + totals + shipments + timeline */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900">
            <h2 className="border-b border-abyss-800 px-5 py-3 font-semibold text-slate-200">
              Items
            </h2>
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
                  <span className="w-20 text-right font-semibold text-reef-300">
                    {formatPrice(Number(item.unitPrice) * item.quantity)}
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
                  <span>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                  <span>−{formatPrice(order.discount)}</span>
                </div>
              )}
              {Number(order.giftCardAmount) > 0 && (
                <div className="flex justify-between text-coral-300">
                  <span>Gift card{order.giftCard ? ` (${order.giftCard.code})` : ""}</span>
                  <span>−{formatPrice(order.giftCardAmount)}</span>
                </div>
              )}
              {order.pointsRedeemed > 0 && (
                <div className="flex justify-between text-coral-300">
                  <span>Reef Points ({order.pointsRedeemed.toLocaleString()})</span>
                  <span>−{formatPrice(order.pointsRedeemed / 100)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span><span>{formatPrice(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax</span><span>{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-abyss-800 pt-2 text-base font-bold text-slate-100">
                <span>Total</span>
                <span className="text-reef-300">{formatPrice(order.total)}</span>
              </div>
              {Number(order.refundAmount) > 0 && (
                <div className="flex justify-between text-coral-300">
                  <span>Refunded{order.refundReason ? ` — ${order.refundReason}` : ""}</span>
                  <span>−{formatPrice(order.refundAmount)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Shipments */}
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-4 font-semibold text-slate-200">Shipments</h2>
            {order.shipments.length > 0 && (
              <div className="mb-5 space-y-2">
                {order.shipments.map((s) => {
                  const url = s.trackingUrl ?? trackingUrl(s.carrier, s.trackingNumber);
                  return (
                    <div
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm ${
                        s.voidedAt
                          ? "border-abyss-800 bg-abyss-950/50 opacity-60"
                          : "border-abyss-700 bg-abyss-950"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-200">
                          {s.carrier} {s.service && `· ${s.service}`}
                        </p>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-reef-300 underline-offset-2 hover:underline"
                          >
                            {s.trackingNumber} ↗
                          </a>
                        ) : (
                          <p className="font-mono text-xs text-reef-300">{s.trackingNumber}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs text-slate-400">
                          <p className="font-semibold uppercase">
                            {s.voidedAt ? "VOIDED" : s.status.replace("_", " ")}
                          </p>
                          {s.shippedAt && <p>shipped {s.shippedAt.toLocaleDateString()}</p>}
                          {s.deliveredAt && <p>delivered {s.deliveredAt.toLocaleDateString()}</p>}
                          {s.cost && <p>label {formatPrice(s.cost)}</p>}
                        </div>
                        {s.labelUrl && !s.voidedAt && (
                          <a
                            href={s.labelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-reef-500/15 px-3 py-1.5 text-xs font-semibold text-reef-200 hover:bg-reef-500/25"
                          >
                            🏷 Label PDF
                          </a>
                        )}
                        {s.status === "IN_TRANSIT" && !s.voidedAt && (
                          <form action={markDelivered}>
                            <input type="hidden" name="shipmentId" value={s.id} />
                            <button className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30">
                              Mark Delivered
                            </button>
                          </form>
                        )}
                        {s.shippoTransactionId && !s.voidedAt && (
                          <form action={voidShippoLabel}>
                            <input type="hidden" name="shipmentId" value={s.id} />
                            <input type="hidden" name="orderId" value={order.id} />
                            <button className="rounded-lg bg-coral-600/15 px-3 py-1.5 text-xs font-semibold text-coral-300 hover:bg-coral-600/25">
                              Void Label
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form action={addShipment} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="orderId" value={order.id} />
              <div>
                <label className={label}>Carrier</label>
                <select name="carrier" defaultValue="UPS" className={input}>
                  <option>UPS</option>
                  <option>FedEx</option>
                  <option>USPS</option>
                  <option>DHL</option>
                </select>
              </div>
              <div>
                <label className={label}>Service</label>
                <select name="service" defaultValue="UPS Next Day Air" className={input}>
                  <option>UPS Next Day Air</option>
                  <option>UPS 2nd Day Air</option>
                  <option>UPS Ground</option>
                  <option>Local Delivery</option>
                </select>
              </div>
              <div>
                <label className={label}>Tracking # (blank = auto placeholder)</label>
                <input name="trackingNumber" placeholder="1Z…" className={input} />
              </div>
              <div>
                <label className={label}>Label Cost ($)</label>
                <input type="number" name="cost" step="0.01" min={0} className={input} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="markShipped" defaultChecked className="h-4 w-4 accent-[#14b5c8]" />
                Mark order as shipped &amp; email tracking
              </label>
              <div className="flex justify-end">
                <button className="rounded-full bg-reef-500 px-6 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
                  Create Shipment
                </button>
              </div>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              Live rates &amp; real label purchase activate automatically once Shippo or
              EasyPost credentials are added to .env — see docs/SHIPPING_SETUP.md.
            </p>
          </section>

          {/* Timeline */}
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-4 font-semibold text-slate-200">Timeline</h2>
            {order.events.length === 0 ? (
              <p className="text-sm text-slate-500">No events recorded yet.</p>
            ) : (
              <ol className="space-y-3 border-l border-abyss-700 pl-4">
                {order.events.map((e) => (
                  <li key={e.id} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-reef-400" />
                    <p className="text-slate-300">{e.message}</p>
                    <p className="text-xs text-slate-500">
                      {e.createdAt.toLocaleString()}
                      {!e.visibleToCustomer && " · internal"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Right: status, refund, customer, address, notes */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-3 font-semibold text-slate-200">Status</h2>
            <form action={updateOrderStatus} className="flex gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <select name="status" defaultValue={order.status} className={input}>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <option key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
              <button className="shrink-0 rounded-lg bg-abyss-700 px-4 text-sm font-semibold text-slate-200 hover:bg-abyss-600">
                Set
              </button>
            </form>
            {cancellable && (
              <form action={cancelOrder} className="mt-3 flex items-center justify-between gap-2 border-t border-abyss-800 pt-3">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" name="restock" defaultChecked className="h-3.5 w-3.5 accent-[#14b5c8]" />
                  Restock items
                </label>
                <button className="rounded-lg bg-coral-500/15 px-3 py-1.5 text-xs font-semibold text-coral-300 hover:bg-coral-500/25">
                  Cancel Order
                </button>
              </form>
            )}
          </section>

          {refundable > 0.005 && order.status !== "PENDING" && order.status !== "CANCELLED" && (
            <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
              <h2 className="mb-3 font-semibold text-slate-200">Refund</h2>
              <form action={refundOrder} className="space-y-2">
                <input type="hidden" name="orderId" value={order.id} />
                <div>
                  <label className={label}>Amount (max {formatPrice(refundable)})</label>
                  <input
                    type="number" name="amount" step="0.01" min="0.01"
                    max={refundable} defaultValue={refundable.toFixed(2)}
                    className={input}
                  />
                </div>
                <div>
                  <label className={label}>Reason</label>
                  <input name="reason" placeholder="DOA claim, cancelled item…" className={input} />
                </div>
                <button className="w-full rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600">
                  Issue Refund
                </button>
                <p className="text-xs text-slate-500">
                  {order.stripePaymentIntentId
                    ? "Refunds through Stripe automatically."
                    : "No Stripe payment on file — records the refund only."}
                </p>
              </form>
            </section>
          )}

          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-sm">
            <h2 className="mb-3 font-semibold text-slate-200">Customer</h2>
            <p className="text-slate-300">{order.user?.name ?? "Guest"}</p>
            <p className="text-slate-400">{order.email}</p>
            {order.user && (
              <p className="mt-2 text-xs text-slate-500">
                {order.user.reefPoints} Reef Points · joined{" "}
                {order.user.createdAt.toLocaleDateString()}
              </p>
            )}
            {order.tickets.length > 0 && (
              <div className="mt-3 border-t border-abyss-800 pt-3">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400">
                  Support tickets
                </p>
                {order.tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/support/${t.id}`}
                    className="block text-xs text-reef-300 hover:text-reef-200"
                  >
                    #{t.number} — {t.subject} ({t.status.replace(/_/g, " ").toLowerCase()})
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-sm">
            <h2 className="mb-3 font-semibold text-slate-200">Ship To</h2>
            {order.shippingAddress ? (
              <address className="not-italic leading-relaxed text-slate-300">
                {order.shippingAddress.name}<br />
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}<br />
                {order.shippingAddress.phone}
              </address>
            ) : (
              <p className="text-slate-500">Local pickup — no shipping address.</p>
            )}
            {order.isGift && order.giftMessage && (
              <div className="mt-3 border-t border-abyss-800 pt-3">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Gift message</p>
                <p className="italic text-slate-300">“{order.giftMessage}”</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-3 font-semibold text-slate-200">Internal Notes</h2>
            <form action={saveOrderNotes}>
              <input type="hidden" name="orderId" value={order.id} />
              <textarea
                name="internalNotes"
                rows={3}
                defaultValue={order.internalNotes ?? ""}
                placeholder="Staff-only notes…"
                className={input}
              />
              <button className="mt-2 rounded-lg bg-abyss-700 px-4 py-1.5 text-sm font-semibold text-slate-200 hover:bg-abyss-600">
                Save Notes
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
