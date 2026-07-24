"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "./prisma";
import { finalizeOrder, money } from "./checkout";

// "use server" files may only export async functions — keep this internal.
function generateGiftCardCode(): string {
  const block = () => randomBytes(2).toString("hex").toUpperCase();
  return `AV365-${block()}-${block()}-${block()}`;
}

/** Staff comp/promo cards (admin UI) — same code shape as purchased cards. */
export async function createCompGiftCard(amount: number, note: string | null, staffId: string) {
  const card = await prisma.giftCard.create({
    data: {
      code: generateGiftCardCode(),
      initialBalance: money(amount),
      balance: money(amount),
      active: true,
      message: note,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: staffId,
      action: "giftcard.comp",
      entity: `GiftCard:${card.id}`,
      detail: { amount },
    },
  });
  return card;
}

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 500;

export async function purchaseGiftCard(formData: FormData) {
  const session = await auth();
  // Two "amount" fields exist (preset radios + optional custom input, which
  // renders later in the DOM) — the last non-empty value wins.
  const amountEntries = formData
    .getAll("amount")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const rawAmount = Number(amountEntries[amountEntries.length - 1] ?? 0);
  const amount = money(Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, rawAmount || 0)));
  const buyerEmail =
    String(formData.get("buyerEmail") ?? "").trim().toLowerCase() ||
    session?.user?.email?.toLowerCase() ||
    "";
  const recipientEmail =
    String(formData.get("recipientEmail") ?? "").trim().toLowerCase() || buyerEmail;
  const recipientName = String(formData.get("recipientName") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim().slice(0, 500) || null;

  if (!buyerEmail || !Number.isFinite(amount) || amount < MIN_AMOUNT) {
    redirect("/gift-cards?error=invalid");
  }

  // Order first (payment vehicle), then the inactive card tied to it —
  // finalizeOrder activates and emails the card when payment lands.
  const order = await prisma.order.create({
    data: {
      email: buyerEmail,
      userId: session?.user?.id,
      status: "PENDING",
      subtotal: amount,
      discount: 0,
      shippingCost: 0,
      tax: 0,
      total: amount,
      internalNotes: "Digital gift card purchase",
      items: {
        create: {
          name: `Digital Gift Card — $${amount.toFixed(2)}`,
          sku: "AV365-GIFTCARD",
          unitPrice: amount,
          quantity: 1,
        },
      },
    },
  });

  await prisma.giftCard.create({
    data: {
      code: generateGiftCardCode(),
      initialBalance: amount,
      balance: amount,
      active: false, // activated on payment
      purchasedById: session?.user?.id,
      purchaseOrderId: order.id,
      recipientEmail,
      recipientName,
      message,
    },
  });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    const stripe = new Stripe(stripeKey);
    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: buyerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `AquaVida365 Digital Gift Card`,
              description: recipientEmail !== buyerEmail
                ? `Delivered to ${recipientEmail} after payment`
                : "Delivered to your email after payment",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { orderId: order.id },
      success_url: `${baseUrl}/gift-cards?sent=1`,
      cancel_url: `${baseUrl}/gift-cards?cancelled=1`,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: checkout.id },
    });
    redirect(checkout.url!);
  }

  // Test mode: finalize immediately (activates + emails the card).
  await finalizeOrder(order.id);
  redirect("/gift-cards?sent=1");
}
