import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { giftCardEmail, orderConfirmationEmail } from "./email-templates";
import { formatMoney } from "./format";
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
  const finalized = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.status !== "PENDING") return false; // already finalized

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
        data: { quantity: { decrement: needed }, soldCount: { increment: needed } },
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

    // Consume applied promotions now that payment is real.
    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }
    if (order.giftCardId && Number(order.giftCardAmount) > 0) {
      // Guarded decrement: a concurrent spend of the same card can't take the
      // balance negative — the losing order gets flagged for staff.
      const res = await tx.giftCard.updateMany({
        where: { id: order.giftCardId, balance: { gte: order.giftCardAmount } },
        data: { balance: { decrement: order.giftCardAmount } },
      });
      if (res.count === 0) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            internalNotes:
              `${order.internalNotes ?? ""}\n⚠ GIFT CARD BALANCE CONFLICT — collect ${formatMoney(order.giftCardAmount as unknown as number)} or adjust`.trim(),
          },
        });
      }
    }
    if (order.userId && order.pointsRedeemed > 0) {
      const res = await tx.user.updateMany({
        where: { id: order.userId, reefPoints: { gte: order.pointsRedeemed } },
        data: { reefPoints: { decrement: order.pointsRedeemed } },
      });
      if (res.count > 0) {
        await tx.pointsTransaction.create({
          data: {
            userId: order.userId,
            points: -order.pointsRedeemed,
            reason: "REDEEMED",
            orderId: order.id,
          },
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

      // Referral reward: first paid order triggers the referrer's bonus.
      const buyer = await tx.user.findUnique({ where: { id: order.userId } });
      if (buyer?.referredById) {
        const priorPaid = await tx.order.count({
          where: {
            userId: buyer.id,
            id: { not: order.id },
            status: { notIn: ["PENDING", "CANCELLED"] },
          },
        });
        if (priorPaid === 0) {
          const REFERRAL_BONUS = 500;
          await tx.pointsTransaction.create({
            data: {
              userId: buyer.referredById,
              points: REFERRAL_BONUS,
              reason: "REFERRAL",
              orderId: order.id,
              note: `Referred customer placed their first order`,
            },
          });
          await tx.user.update({
            where: { id: buyer.referredById },
            data: { reefPoints: { increment: REFERRAL_BONUS } },
          });
        }
      }
    }

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: "payment",
        message: paymentIntentId
          ? "Payment received via Stripe"
          : "Payment recorded (test mode)",
      },
    });
    return true;
  });

  // Post-transaction side effects — only on the run that actually finalized,
  // so webhook retries can't duplicate the confirmation email.
  if (!finalized) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      giftCardsIssued: true,
      user: { select: { name: true } },
    },
  });
  if (order && order.status === "PAID") {
    const tpl = orderConfirmationEmail({
      orderNumber: order.orderNumber,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: formatMoney(Number(i.unitPrice) * i.quantity),
      })),
      total: formatMoney(order.total),
      isPickup: !order.shippingAddressId,
    });
    await sendEmail({
      to: order.email,
      ...tpl,
      template: "order-confirmation",
      meta: { orderId },
    });

    // Digital gift cards bought in this order: activate + deliver by email.
    for (const gc of order.giftCardsIssued) {
      if (gc.active && gc.deliveredAt) continue;
      await prisma.giftCard.update({
        where: { id: gc.id },
        data: { active: true, deliveredAt: new Date() },
      });
      const giftTpl = giftCardEmail({
        code: gc.code,
        amount: formatMoney(gc.initialBalance),
        recipientName: gc.recipientName,
        fromName: order.user?.name ?? null,
        message: gc.message,
      });
      await sendEmail({
        to: gc.recipientEmail ?? order.email,
        ...giftTpl,
        template: "gift-card",
        meta: { orderId, giftCardId: gc.id },
      });
    }
  }
}
