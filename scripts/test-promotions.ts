// Promotions engine test: coupons (percent/fixed/free-shipping), gift-card
// application, Reef Points redemption, tax, and the stacking order that
// produces the final charge. Seeds throwaway rows and cleans them up.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { computeCheckout } from "../src/lib/promotions";
import { calcTax, SHIPPING_DEFAULTS, TAX_DEFAULTS } from "../src/lib/settings";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}
function approx(a: number, b: number, msg: string) {
  assert(Math.abs(a - b) < 0.005, `${msg} (got ${a}, expected ${b})`);
}

// Coupon codes are always stored uppercase (createCoupon uppercases them);
// match that so findValidCoupon's uppercase lookup resolves.
const TAG = `TESTPROMO${Date.now()}`;

async function main() {
  const shipping = SHIPPING_DEFAULTS;

  // ── Pure tax math ────────────────────────────────────────────────────────
  approx(calcTax({ ...TAX_DEFAULTS, enabled: false }, 100, 10, { state: "CA", homeState: "CA" }), 0, "tax off");
  approx(
    calcTax({ ...TAX_DEFAULTS, enabled: true, ratePct: 8, homeStateOnly: false }, 100, 10, { state: "NY", homeState: "CA" }),
    8,
    "tax 8% of 100",
  );
  approx(
    calcTax({ ...TAX_DEFAULTS, enabled: true, ratePct: 8, homeStateOnly: true }, 100, 10, { state: "NY", homeState: "CA" }),
    0,
    "nexus: no tax outside home state",
  );
  approx(
    calcTax({ ...TAX_DEFAULTS, enabled: true, ratePct: 10, homeStateOnly: true, taxShipping: true }, 100, 20, { state: "CA", homeState: "CA" }),
    12,
    "tax includes shipping when enabled",
  );
  console.log("  ✓ tax math");

  // ── Seed coupons, gift card, user ────────────────────────────────────────
  const [pct, fixed, freeship, gift, user] = await Promise.all([
    prisma.coupon.create({ data: { code: `${TAG}-PCT`, type: "PERCENT", value: 10, active: true } }),
    prisma.coupon.create({ data: { code: `${TAG}-FIX`, type: "FIXED", value: 25, active: true } }),
    prisma.coupon.create({ data: { code: `${TAG}-SHIP`, type: "FREE_SHIPPING", value: 0, active: true } }),
    prisma.giftCard.create({
      data: { code: `AV365-${TAG.slice(-8).toUpperCase()}`, initialBalance: 50, balance: 50, active: true },
    }),
    prisma.user.create({
      data: { email: `${TAG}@example.com`, reefPoints: 1500 }, // worth $15
    }),
  ]);

  const subtotal = 200;
  const base = {
    subtotal,
    shipping,
    method: "overnight" as const,
    state: "TX", // out of state → overnight rate applies, no CA nexus tax
    userId: user.id,
  };

  try {
    // Percent coupon: 10% of 200 = 20 off. Shipping 60 (under free threshold @ 350). Total 240.
    let t = await computeCheckout({ ...base, promos: { couponCode: pct.code } });
    approx(t.couponDiscount, 20, "percent discount");
    approx(t.shippingCost, 60, "shipping applied");
    approx(t.total, 240, "percent total (200-20+60)");

    // Fixed coupon: 25 off. Total 200-25+60 = 235.
    t = await computeCheckout({ ...base, promos: { couponCode: fixed.code } });
    approx(t.couponDiscount, 25, "fixed discount");
    approx(t.total, 235, "fixed total");

    // Free shipping coupon: shipping 0. Total 200.
    t = await computeCheckout({ ...base, promos: { couponCode: freeship.code } });
    approx(t.shippingCost, 0, "free shipping");
    approx(t.total, 200, "free-ship total");

    // Points only: 1500 pts = $15 off. Total 200 + 60 - 15 = 245.
    t = await computeCheckout({ ...base, promos: { usePoints: true } });
    approx(t.pointsValue, 15, "points value");
    assert(t.pointsApplied === 1500, "points applied count");
    approx(t.total, 245, "points total");

    // Gift card only: $50 off. Total 200 + 60 - 50 = 210.
    t = await computeCheckout({ ...base, promos: { giftCardCode: gift.code } });
    approx(t.giftCardApplied, 50, "gift card applied");
    approx(t.total, 210, "gift card total");

    // Stack everything: 200 - 20 (10%) + 60 ship = 240; - 15 points = 225; - 50 gift = 175.
    t = await computeCheckout({
      ...base,
      promos: { couponCode: pct.code, usePoints: true, giftCardCode: gift.code },
    });
    approx(t.couponDiscount, 20, "stacked coupon");
    approx(t.pointsValue, 15, "stacked points");
    approx(t.giftCardApplied, 50, "stacked gift card");
    approx(t.total, 175, "stacked total (200-20+60-15-50)");
    console.log("  ✓ coupon + points + gift card stacking");

    // Gift card can't exceed remaining balance-owed: tiny order, big card.
    t = await computeCheckout({
      ...base,
      subtotal: 10,
      promos: { giftCardCode: gift.code },
    });
    // 10 + 60 shipping = 70 owed; card covers 50 → total 20.
    approx(t.giftCardApplied, 50, "gift card capped at balance");
    approx(t.total, 20, "small order gift total");

    console.log("Promotions test passed.");
  } finally {
    // Cleanup
    await prisma.coupon.deleteMany({ where: { code: { startsWith: TAG } } });
    await prisma.giftCard.deleteMany({ where: { code: { contains: TAG.slice(-8).toUpperCase() } } });
    await prisma.pointsTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("Promotions test FAILED:", e);
    process.exit(1);
  },
);
