import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { placeOrder } from "@/lib/checkout-actions";
import { applyPromoCode, removePromo, togglePoints } from "@/lib/promo-actions";
import { computeCheckout, getAppliedPromos, POINTS_PER_DOLLAR } from "@/lib/promotions";
import { getShippingSettings } from "@/lib/settings";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Checkout" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string; promoError?: string }>;
}) {
  const [cart, session, { error, cancelled, promoError }, shipping, promos] =
    await Promise.all([
      getCart(),
      auth(),
      searchParams,
      getShippingSettings(),
      getAppliedPromos(),
    ]);
  if (!cart || cart.items.length === 0) redirect("/cart");

  const subtotal = cart.items.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0,
  );

  const [totals, user, defaultAddress] = await Promise.all([
    // Preview totals assume the overnight/out-of-state worst case; the final
    // numbers are recomputed from the submitted address in placeOrder.
    computeCheckout({
      subtotal,
      shipping,
      method: "overnight",
      state: null,
      userId: session?.user?.id,
      promos,
    }),
    session?.user
      ? prisma.user.findUnique({ where: { id: session.user.id } })
      : null,
    session?.user
      ? prisma.address.findFirst({
          where: { userId: session.user.id, isDefault: true },
        })
      : null,
  ]);

  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
  const pointsDollars = user ? Math.floor(user.reefPoints / POINTS_PER_DOLLAR) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>

      {cancelled && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          Payment was cancelled — your cart is untouched. Ready when you are.
        </p>
      )}
      {error === "email" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Please enter your email address.
        </p>
      )}
      {error === "address" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          A complete shipping address is required for overnight delivery.
        </p>
      )}
      {promoError && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          {promoError}
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-5">
        {/* Left: details */}
        <form action={placeOrder} id="checkout-form" className="space-y-8 lg:col-span-3">
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-4 font-semibold text-slate-200">Contact</h2>
            <label className={label} htmlFor="co-email">Email</label>
            <input
              id="co-email"
              type="email"
              name="email"
              required
              defaultValue={session?.user?.email ?? ""}
              placeholder="you@reef.com"
              className={input}
            />
            {!session?.user && (
              <p className="mt-2 text-xs text-slate-500">
                Have an account?{" "}
                <Link href="/login?next=/checkout" className="text-reef-400 hover:text-reef-300">
                  Sign in
                </Link>{" "}
                to earn Reef Points on this order.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-4 font-semibold text-slate-200">Delivery</h2>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-abyss-700 bg-abyss-950 p-4 transition has-[:checked]:border-reef-500/60 has-[:checked]:bg-abyss-800">
                <input type="radio" name="shippingMethod" value="overnight" defaultChecked className="mt-1 accent-[#14b5c8]" />
                <span className="flex-1">
                  <span className="flex items-center justify-between font-medium text-slate-200">
                    {shipping.overnightLabel}
                    <span className="font-bold text-reef-300">
                      {totals.shippingCost === 0 ? "FREE" : formatPrice(totals.shippingCost)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {shipping.overnightDescription}
                    {totals.shippingCost > 0 && (
                      <>
                        {" "}· {formatPrice(shipping.inStateRate)} in {shipping.homeState} ·
                        free over {formatPrice(shipping.freeShippingThreshold)}
                      </>
                    )}
                  </span>
                </span>
              </label>
              {shipping.localPickupEnabled && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-abyss-700 bg-abyss-950 p-4 transition has-[:checked]:border-reef-500/60 has-[:checked]:bg-abyss-800">
                  <input type="radio" name="shippingMethod" value="pickup" className="mt-1 accent-[#14b5c8]" />
                  <span className="flex-1">
                    <span className="flex items-center justify-between font-medium text-slate-200">
                      Local Pickup
                      <span className="font-bold text-reef-300">FREE</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      Pick up in store — we&apos;ll email you when it&apos;s ready
                    </span>
                  </span>
                </label>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {shipping.shipDaysNote}. {shipping.allowedStatesNote}
            </p>
          </section>

          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-1 font-semibold text-slate-200">Shipping Address</h2>
            <p className="mb-4 text-xs text-slate-500">
              Not needed for local pickup.
              {defaultAddress && " Pre-filled from your default address."}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={label} htmlFor="co-name">Full Name</label>
                <input id="co-name" name="shipName"
                  defaultValue={defaultAddress?.name ?? session?.user?.name ?? ""}
                  autoComplete="name" className={input} />
              </div>
              <div>
                <label className={label} htmlFor="co-line1">Address Line 1</label>
                <input id="co-line1" name="line1" defaultValue={defaultAddress?.line1 ?? ""}
                  autoComplete="address-line1" className={input} />
              </div>
              <div>
                <label className={label} htmlFor="co-line2">Apt / Suite (optional)</label>
                <input id="co-line2" name="line2" defaultValue={defaultAddress?.line2 ?? ""}
                  autoComplete="address-line2" className={input} />
              </div>
              <div>
                <label className={label} htmlFor="co-city">City</label>
                <input id="co-city" name="city" defaultValue={defaultAddress?.city ?? ""}
                  autoComplete="address-level2" className={input} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label} htmlFor="co-state">State</label>
                  <input id="co-state" name="state" defaultValue={defaultAddress?.state ?? ""}
                    autoComplete="address-level1" className={input} />
                </div>
                <div>
                  <label className={label} htmlFor="co-zip">ZIP</label>
                  <input id="co-zip" name="postalCode" defaultValue={defaultAddress?.postalCode ?? ""}
                    autoComplete="postal-code" className={input} />
                </div>
              </div>
              <div>
                <label className={label} htmlFor="co-phone">Phone (for the driver)</label>
                <input id="co-phone" name="phone" defaultValue={defaultAddress?.phone ?? ""}
                  autoComplete="tel" className={input} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" name="isGift" className="mt-1 h-4 w-4 accent-[#14b5c8]" />
              <span>
                <span className="font-semibold text-slate-200">🎁 This is a gift</span>
                <span className="block text-xs text-slate-400">
                  We&apos;ll include a gift receipt (no prices) and your message on the
                  packing slip.
                </span>
              </span>
            </label>
            <textarea
              name="giftMessage"
              rows={2}
              maxLength={300}
              placeholder="Gift message (optional)"
              className={`${input} mt-3`}
            />
          </section>
        </form>

        {/* Right: summary + promos */}
        <div className="lg:col-span-2">
          <div className="sticky top-28 space-y-4">
            {/* Promo code */}
            <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
              <h2 className="mb-3 font-semibold text-slate-200">Discounts &amp; Gift Cards</h2>
              <form action={applyPromoCode} className="flex gap-2">
                <label className="sr-only" htmlFor="promo-code">Coupon or gift card code</label>
                <input
                  id="promo-code"
                  name="code"
                  placeholder="Coupon or AV365- gift card"
                  className={input}
                />
                <button className="shrink-0 rounded-lg bg-abyss-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-abyss-600">
                  Apply
                </button>
              </form>

              <div className="mt-3 space-y-2 text-sm">
                {totals.coupon && (
                  <div className="flex items-center justify-between rounded-lg border border-reef-500/30 bg-reef-500/5 px-3 py-2">
                    <span className="text-reef-300">
                      🏷️ {totals.coupon.code} — saves {formatPrice(totals.couponDiscount)}
                      {totals.coupon.type === "FREE_SHIPPING" && " (free shipping)"}
                    </span>
                    <form action={removePromo}>
                      <input type="hidden" name="kind" value="coupon" />
                      <button className="text-xs text-slate-400 hover:text-coral-300">Remove</button>
                    </form>
                  </div>
                )}
                {totals.giftCard && (
                  <div className="flex items-center justify-between rounded-lg border border-reef-500/30 bg-reef-500/5 px-3 py-2">
                    <span className="text-reef-300">
                      🎁 {totals.giftCard.code} — {formatPrice(totals.giftCardApplied)} applied
                    </span>
                    <form action={removePromo}>
                      <input type="hidden" name="kind" value="giftCard" />
                      <button className="text-xs text-slate-400 hover:text-coral-300">Remove</button>
                    </form>
                  </div>
                )}
                {user && pointsDollars >= 1 && (
                  <form action={togglePoints}>
                    <button
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        promos.usePoints
                          ? "border-reef-500/40 bg-reef-500/5 text-reef-300"
                          : "border-abyss-700 text-slate-300 hover:border-reef-500/40"
                      }`}
                    >
                      {promos.usePoints
                        ? `✨ Applying ${totals.pointsApplied.toLocaleString()} Reef Points (−${formatPrice(totals.pointsValue)}) — tap to remove`
                        : `✨ Apply ${user.reefPoints.toLocaleString()} Reef Points (worth up to ${formatPrice(pointsDollars)})`}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
              <h2 className="mb-4 font-semibold text-slate-200">Order Summary</h2>
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-abyss-800">
                      {item.product.images[0] && (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      )}
                      <span className="absolute -right-0 -top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-abyss-700 px-1 text-[10px] font-bold text-slate-200">
                        {item.quantity}
                      </span>
                    </div>
                    <p className="min-w-0 flex-1 truncate text-slate-300">{item.product.name}</p>
                    <p className="font-medium text-slate-200">
                      {formatPrice(Number(item.product.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 border-t border-abyss-800 pt-4 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {totals.couponDiscount > 0 && (
                  <div className="flex justify-between text-coral-300">
                    <span>Coupon</span>
                    <span>−{formatPrice(totals.couponDiscount)}</span>
                  </div>
                )}
                {totals.pointsValue > 0 && (
                  <div className="flex justify-between text-coral-300">
                    <span>Reef Points</span>
                    <span>−{formatPrice(totals.pointsValue)}</span>
                  </div>
                )}
                {totals.giftCardApplied > 0 && (
                  <div className="flex justify-between text-coral-300">
                    <span>Gift card</span>
                    <span>−{formatPrice(totals.giftCardApplied)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Shipping</span>
                  <span>
                    {totals.shippingCost === 0 ? "FREE" : `up to ${formatPrice(totals.shippingCost)}`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-abyss-800 pt-2 text-base font-bold">
                  <span>Total</span>
                  <span className="text-reef-300">{formatPrice(totals.total)}</span>
                </div>
              </div>
              <button
                type="submit"
                form="checkout-form"
                className="mt-5 w-full rounded-full bg-coral-500 py-3.5 font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600"
              >
                {totals.total === 0
                  ? "Place Order — Fully Covered 🎉"
                  : stripeEnabled
                    ? "Continue to Payment"
                    : "Place Order (Test Mode)"}
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                {stripeEnabled
                  ? "Secure payment by Stripe — cards, Apple Pay & Google Pay."
                  : "Test mode: no payment is taken until Stripe keys are configured."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
