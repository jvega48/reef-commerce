import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  addShipment,
  saveOrderNotes,
  updateOrderStatus,
} from "@/lib/order-actions";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Order — Admin" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-300",
  PAID: "bg-emerald-500/20 text-emerald-300",
  PROCESSING: "bg-reef-500/20 text-reef-300",
  SHIPPED: "bg-blue-500/20 text-blue-300",
  DELIVERED: "bg-emerald-500/20 text-emerald-300",
  CANCELLED: "bg-slate-500/20 text-slate-300",
  REFUNDED: "bg-coral-500/20 text-coral-300",
  PARTIALLY_REFUNDED: "bg-coral-500/20 text-coral-300",
};

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: true,
      shippingAddress: true,
      shipments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_COLORS[order.status] ?? ""}`}
            >
              {order.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {order.createdAt.toLocaleString()} · {order.email}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/admin/orders/${order.id}/packing-slip`}
            className="rounded-full border border-reef-500/50 px-5 py-2 text-sm font-semibold text-reef-300 transition hover:bg-reef-500 hover:text-abyss-950"
          >
            🖨 Packing Slip &amp; Label
          </Link>
          <Link href="/admin/orders" className="self-center text-sm text-slate-400 hover:text-reef-300">
            ← All orders
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: items + totals */}
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
                  <span>Discount</span><span>−{formatPrice(order.discount)}</span>
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
            </div>
          </section>

          {/* Shipments */}
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-4 font-semibold text-slate-200">Shipments</h2>
            {order.shipments.length > 0 && (
              <div className="mb-5 space-y-2">
                {order.shipments.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-abyss-700 bg-abyss-950 px-4 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">
                        {s.carrier} {s.service && `· ${s.service}`}
                      </p>
                      <p className="font-mono text-xs text-reef-300">{s.trackingNumber}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p className="font-semibold uppercase">{s.status.replace("_", " ")}</p>
                      {s.shippedAt && <p>shipped {s.shippedAt.toLocaleDateString()}</p>}
                      {s.cost && <p>label {formatPrice(s.cost)}</p>}
                    </div>
                  </div>
                ))}
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
                Mark order as shipped
              </label>
              <div className="flex justify-end">
                <button className="rounded-full bg-reef-500 px-6 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
                  Create Shipment
                </button>
              </div>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              Live UPS rates &amp; real label purchase activate automatically once UPS API
              credentials are added to .env.
            </p>
          </section>
        </div>

        {/* Right: status, customer, address, notes */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-3 font-semibold text-slate-200">Status</h2>
            <form action={updateOrderStatus} className="flex gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <select name="status" defaultValue={order.status} className={input}>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
              <button className="shrink-0 rounded-lg bg-abyss-700 px-4 text-sm font-semibold text-slate-200 hover:bg-abyss-600">
                Set
              </button>
            </form>
          </section>

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
