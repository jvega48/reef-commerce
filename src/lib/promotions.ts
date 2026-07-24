import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { calcShipping, money, type ShippingMethod } from "./checkout";
import type { ShippingSettings } from "./settings";
import type { Coupon, GiftCard } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Checkout promotions: coupon + gift card + Reef Points, applied via a cookie
// so the (server-rendered) checkout page can show real totals before payment.
// placeOrder re-validates everything server-side at submit time — the cookie
// is a UI convenience, never a source of truth for money.
//
// Money semantics: Order.total is the amount actually charged.
//   total = max(0, subtotal − couponDiscount − giftCard − points + shipping + tax)
// ---------------------------------------------------------------------------

export const PROMO_COOKIE = "av365_promo";
export const POINTS_PER_DOLLAR = 100; // 100 pts = $1

export type AppliedPromos = {
  couponCode?: string;
  giftCardCode?: string;
  usePoints?: boolean;
};

export async function getAppliedPromos(): Promise<AppliedPromos> {
  const jar = await cookies();
  try {
    const raw = jar.get(PROMO_COOKIE)?.value;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      couponCode: typeof parsed.couponCode === "string" ? parsed.couponCode : undefined,
      giftCardCode: typeof parsed.giftCardCode === "string" ? parsed.giftCardCode : undefined,
      usePoints: parsed.usePoints === true,
    };
  } catch {
    return {};
  }
}

export function isGiftCardCode(code: string): boolean {
  return /^AV365-/i.test(code.trim());
}

export async function findValidCoupon(
  code: string,
  subtotal: number,
): Promise<{ coupon: Coupon } | { error: string }> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
  });
  if (!coupon || !coupon.active) return { error: "That code isn't valid." };
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { error: "That code isn't active yet." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { error: "That code has expired." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { error: "That code has been fully redeemed." };
  }
  if (coupon.minSubtotal != null && subtotal < Number(coupon.minSubtotal)) {
    return {
      error: `That code needs a $${Number(coupon.minSubtotal).toFixed(0)}+ subtotal.`,
    };
  }
  return { coupon };
}

export async function findValidGiftCard(
  code: string,
): Promise<{ giftCard: GiftCard } | { error: string }> {
  const giftCard = await prisma.giftCard.findUnique({
    where: { code: code.toUpperCase().trim() },
  });
  if (!giftCard || !giftCard.active) return { error: "That gift card isn't valid." };
  if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
    return { error: "That gift card has expired." };
  }
  if (Number(giftCard.balance) <= 0) return { error: "That gift card has a $0 balance." };
  return { giftCard };
}

export interface CheckoutTotals {
  subtotal: number;
  coupon: Coupon | null;
  couponDiscount: number;
  shippingCost: number;
  pointsApplied: number; // points count
  pointsValue: number; // dollars
  giftCard: GiftCard | null;
  giftCardApplied: number; // dollars
  tax: number;
  total: number; // amount to charge
}

/**
 * Compute checkout totals from the applied promos. Invalid/expired entries are
 * silently dropped (they'll also disappear from the UI on next render).
 */
export async function computeCheckout(opts: {
  subtotal: number;
  shipping: ShippingSettings;
  method: ShippingMethod;
  state?: string | null;
  userId?: string | null;
  promos: AppliedPromos;
}): Promise<CheckoutTotals> {
  const { subtotal, shipping, method, state, userId, promos } = opts;

  let coupon: Coupon | null = null;
  let couponDiscount = 0;
  if (promos.couponCode) {
    const res = await findValidCoupon(promos.couponCode, subtotal);
    if ("coupon" in res) {
      coupon = res.coupon;
      if (coupon.type === "PERCENT") {
        couponDiscount = money(subtotal * (Number(coupon.value) / 100));
      } else if (coupon.type === "FIXED") {
        couponDiscount = Math.min(money(Number(coupon.value)), subtotal);
      }
    }
  }

  let shippingCost = calcShipping(shipping, method, subtotal, state);
  if (coupon?.type === "FREE_SHIPPING") shippingCost = 0;

  const tax = 0; // configurable tax lands via settings; livestock is untaxed default
  let remaining = money(Math.max(0, subtotal - couponDiscount + shippingCost + tax));

  // Reef Points next (customer's own balance before touching the gift card).
  let pointsApplied = 0;
  let pointsValue = 0;
  if (promos.usePoints && userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.reefPoints >= POINTS_PER_DOLLAR) {
      const maxPointsValue = Math.floor(user.reefPoints / POINTS_PER_DOLLAR);
      pointsValue = Math.min(maxPointsValue, Math.floor(remaining));
      pointsApplied = pointsValue * POINTS_PER_DOLLAR;
      remaining = money(remaining - pointsValue);
    }
  }

  let giftCard: GiftCard | null = null;
  let giftCardApplied = 0;
  if (promos.giftCardCode) {
    const res = await findValidGiftCard(promos.giftCardCode);
    if ("giftCard" in res) {
      giftCard = res.giftCard;
      giftCardApplied = money(Math.min(Number(giftCard.balance), remaining));
      remaining = money(remaining - giftCardApplied);
    }
  }

  return {
    subtotal,
    coupon,
    couponDiscount,
    shippingCost,
    pointsApplied,
    pointsValue,
    giftCard,
    giftCardApplied,
    tax,
    total: remaining,
  };
}
