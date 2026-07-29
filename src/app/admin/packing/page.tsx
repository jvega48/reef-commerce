import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { advanceOrder, buyShippoLabelsBatch } from "@/lib/order-actions";
import { ORDER_STATUS_LABELS } from "@/lib/tracking";
import { shippoConfigured } from "@/lib/shippo";

export const metadata = { title: "Packing Queue — Admin" };

// The fulfillment work queue: every order that has been paid but hasn't
// shipped, grouped by stage. Buttons advance orders one stage at a time;
// shipping happens from the order page (label + tracking).

export default async function PackingQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const batchCount = Array.isArray(sp.batch) ? sp.batch[0] : sp.batch;
  const batchFailed = Array.isArray(sp.failed) ? sp.failed[0] : sp.failed;
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PAID", "PACKING", "READY_TO_SHIP"] } },
    orderBy: { createdAt: "asc" },
    include: {
      items: true,
      shippingAddress: { select: { city: true, state: true } },
    },
  });
  const readyToShipIds = orders
    .filter((o) => o.status === "READY_TO_SHIP" && o.shippingAddressId)
    .map((o) => o.id);

  const stages = [
    { status: "PAID", title: "New / Paid", hint: "Pull livestock, start packing", cta: "Start Packing →" },
    { status: "PACKING", title: "Packing", hint: "Bag, insulate, heat/cold packs", cta: "Ready to Ship →" },
    { status: "READY_TO_SHIP", title: "Ready to Ship", hint: "Create label from the order page", cta: null },
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-bold">Packing Queue</h1>
      <p className="mt-1 text-sm text-slate-400">
        {orders.length} order{orders.length === 1 ? "" : "s"} in the pipeline ·
        live orders ship Tuesday &amp; Wednesday
      </p>
      {batchCount && (
        <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
          ✓ Batch complete: {batchCount} order(s) processed
          {batchFailed && batchFailed !== "0" ? `, ${batchFailed} failed (check those orders)` : ""}.
        </div>
      )}
      {shippoConfigured() && readyToShipIds.length > 0 && (
        <form action={buyShippoLabelsBatch} className="mt-3">
          <input type="hidden" name="orderIds" value={readyToShipIds.join(",")} />
          <button className="rounded-full border border-reef-500 bg-reef-500/10 px-4 py-2 text-sm font-semibold text-reef-200 transition hover:bg-reef-500 hover:text-abyss-950">
            🏷 Buy labels for all {readyToShipIds.length} Ready-to-Ship
          </button>
        </form>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {stages.map((stage) => {
          const stageOrders = orders.filter((o) => o.status === stage.status);
          return (
            <section
              key={stage.status}
              className="rounded-2xl border border-abyss-700/60 bg-abyss-900"
            >
              <header className="border-b border-abyss-800 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-200">{stage.title}</h2>
                  <span className="rounded-full bg-abyss-800 px-2.5 py-0.5 text-xs font-bold text-reef-300">
                    {stageOrders.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{stage.hint}</p>
              </header>

              <div className="space-y-3 p-4">
                {stageOrders.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">Empty — nice.</p>
                )}
                {stageOrders.map((o) => (
                  <article
                    key={o.id}
                    className="rounded-xl border border-abyss-700 bg-abyss-950 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-semibold text-reef-300 hover:text-reef-200"
                      >
                        #{o.orderNumber}
                      </Link>
                      <span className="text-xs text-slate-500">
                        {o.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {o.email}
                      {o.shippingAddress
                        ? ` · ${o.shippingAddress.city}, ${o.shippingAddress.state}`
                        : " · local pickup"}
                      {o.isGift && " · 🎁 gift"}
                    </p>

                    <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
                      {o.items.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-abyss-800"
                          title={`${item.quantity}× ${item.name}`}
                        >
                          {item.imageUrl && (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          )}
                        </div>
                      ))}
                      {o.items.length > 5 && (
                        <span className="text-xs text-slate-500">+{o.items.length - 5}</span>
                      )}
                      <span className="ml-auto text-xs text-slate-400">
                        {o.items.reduce((n, i) => n + i.quantity, 0)} pcs
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/orders/${o.id}/packing-slip`}
                        className="text-xs text-slate-400 hover:text-reef-300"
                      >
                        🖨 Slip
                      </Link>
                      {stage.cta ? (
                        <form action={advanceOrder}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <button className="rounded-lg bg-reef-500 px-3 py-1.5 text-xs font-bold text-abyss-950 transition hover:bg-reef-400">
                            {stage.cta}
                          </button>
                        </form>
                      ) : (
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="rounded-lg bg-abyss-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-abyss-600"
                        >
                          Create Label →
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Stage labels: {Object.values(ORDER_STATUS_LABELS).slice(0, 5).join(" → ")}.
        Creating a shipment with “mark as shipped” moves the order out of this queue
        and emails the customer their tracking number.
      </p>
    </div>
  );
}
