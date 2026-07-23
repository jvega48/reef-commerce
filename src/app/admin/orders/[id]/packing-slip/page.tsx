import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";
import PrintButton from "@/components/admin/PrintButton";

export const metadata = { title: "Packing Slip — Admin" };

export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shippingAddress: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) notFound();
  const shipment = order.shipments[0];

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm text-slate-400 hover:text-reef-300">
          ← Back to order #{order.orderNumber}
        </Link>
        <PrintButton />
      </div>

      {/* Printable document (white for paper) */}
      <div className="rounded-2xl bg-white p-10 text-black shadow-2xl print:rounded-none print:p-0 print:shadow-none">
        {/* Shipping label block */}
        <div className="mb-8 border-4 border-black p-6">
          <div className="flex items-start justify-between">
            <div className="text-xs leading-relaxed">
              <p className="font-bold uppercase">From</p>
              <p className="font-bold">AquaVida365</p>
              <p>aquavida365.com</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold">{shipment?.carrier ?? "UPS"}</p>
              <p>{shipment?.service ?? "Next Day Air"}</p>
              <p className="mt-1 font-bold">LIVE ANIMALS — PERISHABLE</p>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-xs font-bold uppercase">Ship To</p>
            {order.shippingAddress ? (
              <p className="mt-1 text-2xl font-extrabold uppercase leading-tight">
                {order.shippingAddress.name}<br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && <><br />{order.shippingAddress.line2}</>}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
              </p>
            ) : (
              <p className="mt-1 text-2xl font-extrabold uppercase">LOCAL PICKUP</p>
            )}
          </div>
          {shipment?.trackingNumber && (
            <div className="mt-6 border-t-2 border-black pt-3">
              <p className="text-xs font-bold uppercase">Tracking</p>
              <p className="font-mono text-xl font-bold tracking-widest">
                {shipment.trackingNumber}
              </p>
            </div>
          )}
        </div>

        {/* Packing slip */}
        <div className="flex items-baseline justify-between border-b-2 border-black pb-3">
          <h1 className="text-2xl font-extrabold">Packing Slip</h1>
          <div className="text-right text-sm">
            <p className="font-bold">Order #{order.orderNumber}</p>
            <p>{order.createdAt.toLocaleDateString()}</p>
          </div>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left text-xs uppercase">
              <th className="py-2">Item</th>
              <th className="py-2">SKU</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-300">
                <td className="py-2 font-medium">{item.name}</td>
                <td className="py-2 font-mono text-xs">{item.sku}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{formatPrice(item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-56 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between"><span>Discount</span><span>−{formatPrice(order.discount)}</span></div>
          )}
          <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(order.shippingCost)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatPrice(order.tax)}</span></div>
          <div className="flex justify-between border-t border-black pt-1 font-bold">
            <span>Total</span><span>{formatPrice(order.total)}</span>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-600">
          Float bags 15–20 min before acclimating · 100% live-arrival guarantee — photograph
          any DOA in the unopened bag within 2 hours of delivery · Thank you for supporting AquaVida365 🪸
        </p>
      </div>
    </div>
  );
}
