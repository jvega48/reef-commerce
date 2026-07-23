import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCart } from "@/lib/cart";
import { placeOrder } from "@/lib/checkout-actions";
import { getShippingSettings } from "@/lib/settings";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Checkout" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const [cart, session, { error, cancelled }, shipping] = await Promise.all([
    getCart(),
    auth(),
    searchParams,
    getShippingSettings(),
  ]);
  if (!cart || cart.items.length === 0) redirect("/cart");

  const subtotal = cart.items.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0,
  );
  const overnightRate =
    subtotal >= shipping.freeShippingThreshold ? 0 : shipping.overnightRate;
  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

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

      <form action={placeOrder} className="mt-8 grid gap-10 lg:grid-cols-5">
        {/* Left: details */}
        <div className="space-y-8 lg:col-span-3">
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-4 font-semibold text-slate-200">Contact</h2>
            <label className={label}>Email</label>
            <input
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
                <Link href="/login" className="text-reef-400 hover:text-reef-300">
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
                      {overnightRate === 0 ? "FREE" : formatPrice(overnightRate)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {shipping.overnightDescription}
                    {overnightRate > 0 && (
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
            <p className="mb-4 text-xs text-slate-500">Not needed for local pickup.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={label}>Full Name</label>
                <input name="shipName" defaultValue={session?.user?.name ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Address Line 1</label>
                <input name="line1" className={input} />
              </div>
              <div>
                <label className={label}>Apt / Suite (optional)</label>
                <input name="line2" className={input} />
              </div>
              <div>
                <label className={label}>City</label>
                <input name="city" className={input} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>State</label>
                  <input name="state" className={input} />
                </div>
                <div>
                  <label className={label}>ZIP</label>
                  <input name="postalCode" className={input} />
                </div>
              </div>
              <div>
                <label className={label}>Phone (for the driver)</label>
                <input name="phone" className={input} />
              </div>
            </div>
          </section>
        </div>

        {/* Right: summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-28 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-4 font-semibold text-slate-200">Order Summary</h2>
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
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
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span>
                <span>{overnightRate === 0 ? "FREE" : `up to ${formatPrice(overnightRate)}`}</span>
              </div>
              <div className="flex justify-between border-t border-abyss-800 pt-2 text-base font-bold">
                <span>Total</span>
                <span className="text-reef-300">{formatPrice(subtotal + overnightRate)}</span>
              </div>
            </div>
            <button
              type="submit"
              className="mt-5 w-full rounded-full bg-coral-500 py-3.5 font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600"
            >
              {stripeEnabled ? "Continue to Payment" : "Place Order (Test Mode)"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              {stripeEnabled
                ? "Secure payment by Stripe — cards, Apple Pay & Google Pay."
                : "Test mode: no payment is taken until Stripe keys are configured."}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
