import type { Metadata } from "next";
import Link from "next/link";
import { getShippingSettings, getGuaranteeSettings } from "@/lib/settings";
import { formatPrice } from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Overnight insulated shipping for live corals, fish, and invertebrates — free on qualifying orders.",
};

export default async function ShippingPolicyPage() {
  const [s, g] = await Promise.all([getShippingSettings(), getGuaranteeSettings()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Shipping Policy</h1>
      <p className="mt-2 text-slate-400">
        Every live order ships overnight in an insulated box with heat or cold
        packs, timed so your animals spend as little time in transit as possible.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-center">
          <p className="text-2xl font-bold text-reef-300">{formatPrice(s.overnightRate)}</p>
          <p className="mt-1 text-xs text-slate-400">
            Overnight shipping up to {s.maxBoxWeightLbs} lbs
          </p>
        </div>
        <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-center">
          <p className="text-2xl font-bold text-reef-300">{formatPrice(s.inStateRate)}</p>
          <p className="mt-1 text-xs text-slate-400">Within {s.homeState}</p>
        </div>
        <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-center">
          <p className="text-2xl font-bold text-coral-400">FREE</p>
          <p className="mt-1 text-xs text-slate-400">
            Orders over {formatPrice(s.freeShippingThreshold)}
          </p>
        </div>
      </div>

      <div className="prose-invert mt-10 space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">When we ship</h2>
          <p>
            {s.shipDaysNote}. Shipping early in the week protects your livestock —
            packages never sit in a carrier facility over the weekend. You pick
            your delivery date at checkout, and someone should be present to
            receive the box. Orders shipped Monday or Friday at the customer&apos;s
            request are not covered by our DOA guarantee.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">Where we ship</h2>
          <p>
            {s.allowedStatesNote} Alaska customers may arrange a UPS or FedEx
            facility pickup — <Link href="/contact" className="text-reef-400 hover:text-reef-300">contact us</Link> before
            ordering. Transporting corals internationally voids the guarantee.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">Order holds</h2>
          <p>
            Need us to hold your order? Coral orders can be held up to{" "}
            {g.coralHoldDays} days and fish orders up to {g.fishHoldBusinessDays}{" "}
            business days. WYSIWYG order cancellations are subject to a{" "}
            {g.cancellationFeePct}% cancellation fee.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">Free shipping fine print</h2>
          <p>
            The free-shipping threshold applies to standard website orders.
            Live-sale purchases, phone or text orders, and local pickup are
            excluded. Orders with a pending balance will not ship until settled.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">Local pickup</h2>
          <p>
            {s.localPickupEnabled
              ? "Local pickup is available by request — choose it at checkout and we'll email you when your order is ready."
              : "Local pickup is currently unavailable."}
          </p>
        </section>
      </div>

      <p className="mt-10 rounded-xl border border-abyss-700/60 bg-abyss-900 p-4 text-sm text-slate-400">
        Live animals in transit are covered by our{" "}
        <Link href="/guarantee" className="text-reef-400 hover:text-reef-300">
          {g.guaranteeDays}-Day Live Arrival Guarantee
        </Link>
        .
      </p>
    </div>
  );
}
