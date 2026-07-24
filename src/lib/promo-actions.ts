"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCart } from "./cart";
import {
  findValidCoupon,
  findValidGiftCard,
  getAppliedPromos,
  isGiftCardCode,
  PROMO_COOKIE,
  type AppliedPromos,
} from "./promotions";

async function savePromos(promos: AppliedPromos) {
  const jar = await cookies();
  jar.set(PROMO_COOKIE, JSON.stringify(promos), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

/** One field handles both coupon codes and AV365- gift card codes. */
export async function applyPromoCode(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/checkout");

  const cart = await getCart();
  const subtotal =
    cart?.items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0) ?? 0;

  const promos = await getAppliedPromos();

  if (isGiftCardCode(code)) {
    const res = await findValidGiftCard(code);
    if ("error" in res) {
      redirect(`/checkout?promoError=${encodeURIComponent(res.error)}`);
    }
    await savePromos({ ...promos, giftCardCode: code.toUpperCase() });
  } else {
    const res = await findValidCoupon(code, subtotal);
    if ("error" in res) {
      redirect(`/checkout?promoError=${encodeURIComponent(res.error)}`);
    }
    await savePromos({ ...promos, couponCode: code.toUpperCase() });
  }
  redirect("/checkout");
}

export async function removePromo(formData: FormData) {
  const kind = String(formData.get("kind") ?? "");
  const promos = await getAppliedPromos();
  if (kind === "coupon") delete promos.couponCode;
  if (kind === "giftCard") delete promos.giftCardCode;
  if (kind === "points") delete promos.usePoints;
  await savePromos(promos);
  redirect("/checkout");
}

export async function togglePoints() {
  const promos = await getAppliedPromos();
  await savePromos({ ...promos, usePoints: !promos.usePoints });
  redirect("/checkout");
}
