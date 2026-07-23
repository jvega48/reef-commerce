import type { Metadata } from "next";
import Link from "next/link";
import { getGuaranteeSettings } from "@/lib/settings";
import { formatPrice } from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "Live Arrival Guarantee & Returns",
  description:
    "Our live arrival guarantee, DOA claim process, and refund policy for livestock orders.",
};

export default async function GuaranteePage() {
  const g = await getGuaranteeSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">
        {g.guaranteeDays}-Day Live Arrival Guarantee
      </h1>
      <p className="mt-2 text-slate-400">
        We stand behind every animal we ship. Here is exactly how the guarantee
        works, what we need from you, and what isn&apos;t covered.
      </p>

      <div className="prose-invert mt-10 space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">The guarantee</h2>
          <p>
            Most livestock is covered for live arrival and survival for{" "}
            {g.guaranteeDays} days after delivery, provided the package arrived on
            time, animals were properly acclimated, your aquarium is fully cycled
            and stable, tank mates are compatible, and species-specific needs are
            met. <strong className="text-slate-100">Any concern must be reported by email within the
            first {g.reportWindowDays} days</strong> — losses reported after day{" "}
            {g.reportWindowDays} with no earlier report cannot be claimed, as
            late losses typically indicate tank conditions rather than shipping.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">
            Dead on arrival (DOA) claims
          </h2>
          <p>Within {g.doaVideoWindowHours} hours of delivery, send us:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              A clear video of the deceased animal{" "}
              <strong className="text-slate-100">before opening the bag</strong>
            </li>
            <li>A clear video of the shipping box showing all sides</li>
          </ul>
          <p className="mt-2">
            Please don&apos;t remove corals from their plugs, don&apos;t discard the
            specimen until we authorize it, and never refuse a leaking or damaged
            box — refusing delivery voids the claim. Approved claims receive a
            replacement or store credit. Original shipping is non-refundable and
            replacement shipping is paid by the customer. Losses caused by
            carrier delays, weather, or other events outside our control are not
            covered.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">
            High-value specimens
          </h2>
          <p>
            For animals over {formatPrice(g.highValueVideoThreshold)}, we require
            a 15-second video of the specimen outside of water as part of any
            claim.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">
            Returns & cancellations
          </h2>
          <p>
            There are no refunds or returns on livestock — but reach out for
            unusual circumstances and we&apos;ll work with you case by case. Order
            cancellations receive store credit valid for one year, or a refund
            minus a {g.cancellationFeePct}% restocking fee. Store credit works
            like a prepaid balance and can&apos;t be applied to past orders.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">Not covered</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Aggression or incompatible tank mates</li>
            <li>Poor water quality or improper acclimation</li>
            <li>Tank jumping, or losses inside acclimation boxes</li>
            <li>Packages shipped Monday or Friday at the customer&apos;s request</li>
            <li>
              Repeated unexplained losses (over 60% of a single order) without
              early reporting
            </li>
          </ul>
        </section>
      </div>

      <p className="mt-10 rounded-xl border border-abyss-700/60 bg-abyss-900 p-4 text-sm text-slate-400">
        Questions about a delivery?{" "}
        <Link href="/contact" className="text-reef-400 hover:text-reef-300">
          Contact us
        </Link>{" "}
        — include your order number and photos/videos so we can help fast.
      </p>
    </div>
  );
}
