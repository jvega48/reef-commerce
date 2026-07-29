"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "./prisma";
import { getCart } from "./cart";
import { finalizeOrder, money, type ShippingMethod } from "./checkout";
import { computeCheckout, getAppliedPromos, PROMO_COOKIE } from "./promotions";
import { getShippingSettings } from "./settings";
import { isShippableState } from "./shipping";

const str = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
};

export async function placeOrder(formData: FormData) {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const session = await auth();
  const email =
    String(formData.get("email") ?? "").trim().toLowerCase() ||
    session?.user?.email?.toLowerCase() ||
    "";
  if (!email) redirect("/checkout?error=email");

  const method: ShippingMethod =
    formData.get("shippingMethod") === "pickup" ? "pickup" : "overnight";

  // Address is required unless picking up locally.
  const shipName = str(formData, "shipName");
  const line1 = str(formData, "line1");
  const city = str(formData, "city");
  const state = str(formData, "state");
  const postalCode = str(formData, "postalCode");
  if (method === "overnight" && (!shipName || !line1 || !city || !state || !postalCode)) {
    redirect("/checkout?error=address");
  }

  // Enforce shipping restrictions: we don't ship live animals everywhere.
  const shippingCfgEarly = await getShippingSettings();
  if (method === "overnight" && state && !isShippableState(state, shippingCfgEarly)) {
    redirect(`/checkout?error=state&state=${encodeURIComponent(state)}`);
  }

  // Capture the email on the cart for abandoned-checkout recovery (the cart
  // survives if the customer bails at the payment step).
  await prisma.cart.update({
    where: { id: cart.id },
    data: { email },
  }).catch(() => {});

  // Re-validate stock against the live catalog.
  for (const item of cart.items) {
    const p = item.product;
    const needed = p.inventoryMode === "WYSIWYG" ? 1 : item.quantity;
    if (p.status !== "ACTIVE" || p.quantity < needed) {
      redirect(`/cart?error=stock&name=${encodeURIComponent(p.name)}`);
    }
  }

  const subtotal = money(
    cart.items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0),
  );
  const shippingCfg = await getShippingSettings();
  const userId = session?.user?.id;

  const promos = await getAppliedPromos();
  const totals = await computeCheckout({
    subtotal,
    shipping: shippingCfg,
    method,
    state,
    userId,
    promos,
  });

  const isGift = formData.get("isGift") === "on";
  const giftMessage = isGift ? str(formData, "giftMessage") : null;

  // Create the order in PENDING; it flips to PAID when payment succeeds.
  const order = await prisma.order.create({
    data: {
      email,
      user: userId ? { connect: { id: userId } } : undefined,
      status: "PENDING",
      subtotal,
      discount: totals.couponDiscount,
      coupon: totals.coupon ? { connect: { id: totals.coupon.id } } : undefined,
      pointsRedeemed: totals.pointsApplied,
      giftCard: totals.giftCard ? { connect: { id: totals.giftCard.id } } : undefined,
      giftCardAmount: totals.giftCardApplied,
      isGift,
      giftMessage,
      shippingCost: totals.shippingCost,
      tax: totals.tax,
      total: totals.total,
      shippingAddress:
        method === "overnight"
          ? {
              create: {
                userId,
                name: shipName!,
                line1: line1!,
                line2: str(formData, "line2"),
                city: city!,
                state: state!,
                postalCode: postalCode!,
                phone: str(formData, "phone"),
              },
            }
          : undefined,
      internalNotes: method === "pickup" ? "Local pickup" : null,
      items: {
        create: cart.items.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          sku: i.product.sku,
          unitPrice: i.product.price,
          quantity: i.product.inventoryMode === "WYSIWYG" ? 1 : i.quantity,
          imageUrl: i.product.images[0]?.url ?? null,
        })),
      },
    },
    include: { items: true },
  });

  const jar = await cookies();
  jar.delete(PROMO_COOKIE);

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (stripeKey && totals.total > 0) {
    // Real payment via Stripe Checkout. When promotions are applied the
    // charge no longer equals the item sum, so collapse to a single line —
    // Stripe can't express negative line items.
    const stripe = new Stripe(stripeKey);
    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const hasAdjustments =
      totals.couponDiscount > 0 || totals.giftCardApplied > 0 || totals.pointsValue > 0;

    const lineItems = hasAdjustments
      ? [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `AquaVida365 Order #${order.orderNumber}`,
                description: "Includes applied discounts, gift card, and rewards",
              },
              unit_amount: Math.round(totals.total * 100),
            },
            quantity: 1,
          },
        ]
      : [
          ...order.items.map((item) => ({
            price_data: {
              currency: "usd",
              product_data: { name: item.name },
              unit_amount: Math.round(Number(item.unitPrice) * 100),
            },
            quantity: item.quantity,
          })),
          ...(totals.shippingCost > 0
            ? [
                {
                  price_data: {
                    currency: "usd",
                    product_data: { name: shippingCfg.overnightLabel },
                    unit_amount: Math.round(totals.shippingCost * 100),
                  },
                  quantity: 1,
                },
              ]
            : []),
        ];

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: lineItems,
      metadata: { orderId: order.id },
      success_url: `${baseUrl}/checkout/success?order=${order.id}`,
      cancel_url: `${baseUrl}/checkout?cancelled=1`,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: checkout.id },
    });
    redirect(checkout.url!);
  }

  // Either dev test-mode (no Stripe keys) or a fully-covered $0 order:
  // complete immediately.
  await finalizeOrder(order.id);
  revalidatePath("/shop");
  revalidatePath("/");
  redirect(`/checkout/success?order=${order.id}`);
}
