"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "./prisma";
import { getCart } from "./cart";
import { calcShipping, finalizeOrder, type ShippingMethod } from "./checkout";

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

  // Re-validate stock against the live catalog.
  for (const item of cart.items) {
    const p = item.product;
    const needed = p.inventoryMode === "WYSIWYG" ? 1 : item.quantity;
    if (p.status !== "ACTIVE" || p.quantity < needed) {
      redirect(`/cart?error=stock&name=${encodeURIComponent(p.name)}`);
    }
  }

  const subtotal = cart.items.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0,
  );
  const shippingCost = calcShipping(method, subtotal);
  const total = subtotal + shippingCost;

  const userId = session?.user?.id;

  // Create the order in PENDING; it flips to PAID when payment succeeds.
  const order = await prisma.order.create({
    data: {
      email,
      user: userId ? { connect: { id: userId } } : undefined,
      status: "PENDING",
      subtotal,
      discount: 0,
      shippingCost,
      tax: 0,
      total,
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

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (stripeKey) {
    // Real payment via Stripe Checkout.
    const stripe = new Stripe(stripeKey);
    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        ...order.items.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: { name: item.name },
            unit_amount: Math.round(Number(item.unitPrice) * 100),
          },
          quantity: item.quantity,
        })),
        ...(shippingCost > 0
          ? [
              {
                price_data: {
                  currency: "usd",
                  product_data: { name: "Overnight Shipping (UPS Next Day Air)" },
                  unit_amount: Math.round(shippingCost * 100),
                },
                quantity: 1,
              },
            ]
          : []),
      ],
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

  // Dev test-mode: no Stripe keys yet, so complete the order immediately.
  await finalizeOrder(order.id);
  revalidatePath("/shop");
  revalidatePath("/");
  redirect(`/checkout/success?order=${order.id}`);
}
