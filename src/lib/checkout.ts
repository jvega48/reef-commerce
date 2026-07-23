import { prisma } from "./prisma";
import type { ShippingSettings } from "./settings";

// ---------------------------------------------------------------------------
// Shipping (flat-rate per published policy until the aggregator API is wired
// up). All rates and thresholds come from admin-editable StoreSettings —
// see src/lib/settings.ts.
// ---------------------------------------------------------------------------

export type ShippingMethod = "overnight" | "pickup";

export function calcShipping(
  cfg: ShippingSettings,
  method: ShippingMethod,
  subtotal: number,
  state?: string | null,
): number {
  if (method === "pickup") return 0;
  if (subtotal >= cfg.freeShippingThreshold) return 0;
  const inState =
    (state ?? "").trim().toUpperCase() === cfg.homeState.toUpperCase();
  return inState ? cfg.inStateRate : cfg.overnightRate;
}

/** Round to cents — keeps float arithmetic out of stored money values. */
export const money = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Order finalization — runs when payment succeeds (Stripe webhook) or
// immediately in dev test-mode. Idempotent.
// ---------------------------------------------------------------------------

export async function finalizeOrder(orderId: string, paymentIntentId?: string | null) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.status !== "PENDING") return; // already finalized

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        stripePaymentIntentId: paymentIntentId ?? undefined,
      },
    });

    // Deduct stock; WYSIWYG listings are one-of-a-kind and become SOLD.
    // The conditional WHERE guard makes concurrent purchases safe: when two
    // paid orders race for the last unit, only one decrement can succeed —
    // the loser is flagged for staff follow-up instead of going negative.
    const oversold: string[] = [];
    for (const item of order.items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      const needed = product.inventoryMode === "WYSIWYG" ? 1 : item.quantity;
      const result = await tx.product.updateMany({
        where: { id: product.id, quantity: { gte: needed } },
        data: { quantity: { decrement: needed } },
      });
      if (result.count === 0) {
        oversold.push(item.sku);
        continue;
      }
      if (product.inventoryMode === "WYSIWYG") {
        await tx.product.update({
          where: { id: product.id },
          data: { status: "SOLD" },
        });
      }
    }
    if (oversold.length > 0) {
      await tx.order.update({
        where: { id: orderId },
        data: {
          internalNotes:
            `${order.internalNotes ?? ""}\n⚠ OVERSOLD — contact customer / refund: ${oversold.join(", ")}`.trim(),
        },
      });
    }

    // Reef Points: 1 point per dollar for account holders.
    if (order.userId) {
      const points = Math.floor(Number(order.total));
      if (points > 0) {
        await tx.pointsTransaction.create({
          data: {
            userId: order.userId,
            points,
            reason: "PURCHASE",
            orderId: order.id,
          },
        });
        await tx.user.update({
          where: { id: order.userId },
          data: { reefPoints: { increment: points } },
        });
      }
    }
  });
}
