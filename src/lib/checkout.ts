import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Shipping options (flat-rate until the UPS API is wired up)
// ---------------------------------------------------------------------------

export const FREE_SHIPPING_THRESHOLD = 299;

export const SHIPPING_METHODS = {
  overnight: {
    label: "UPS Next Day Air",
    description: "Required for live corals, fish & inverts — insulated box with heat/cold packs",
    rate: 39.99,
    freeOver: FREE_SHIPPING_THRESHOLD,
  },
  pickup: {
    label: "Local Pickup",
    description: "Pick up in store — we'll email you when it's ready",
    rate: 0,
    freeOver: 0,
  },
} as const;

export type ShippingMethod = keyof typeof SHIPPING_METHODS;

export function calcShipping(method: ShippingMethod, subtotal: number): number {
  const m = SHIPPING_METHODS[method];
  if (m.freeOver > 0 && subtotal >= m.freeOver) return 0;
  return m.rate;
}

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
    for (const item of order.items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      if (product.inventoryMode === "WYSIWYG") {
        await tx.product.update({
          where: { id: product.id },
          data: { quantity: 0, status: "SOLD" },
        });
      } else {
        await tx.product.update({
          where: { id: product.id },
          data: { quantity: Math.max(0, product.quantity - item.quantity) },
        });
      }
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
