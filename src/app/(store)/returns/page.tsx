import type { Metadata } from "next";
import Link from "next/link";
import { getGuaranteeSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "AquaVida365 return and refund policy — livestock guarantee claims, order cancellations, and dry goods returns.",
  alternates: { canonical: "/returns" },
};

export default async function ReturnsPage() {
  const g = await getGuaranteeSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold">
        Returns &amp; <span className="text-gradient">Refunds</span>
      </h1>
      <p className="mt-3 text-slate-400">
        Live animals can&apos;t be &ldquo;returned&rdquo; like a t-shirt — so our policy is
        built around the <Link href="/guarantee" className="text-reef-400 underline">live-arrival
        guarantee</Link> instead.
      </p>

      <div className="mt-8 space-y-6 leading-relaxed text-slate-300">
        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6">
          <h2 className="text-xl font-bold text-slate-100">Livestock</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>No returns or refunds on livestock</strong> once delivered — losses are
              handled through the guarantee (replacement or store credit), reviewed
              case-by-case for unusual circumstances.
            </li>
            <li>
              DOA claims require unopened-bag video within {g.doaVideoWindowHours} hours of
              delivery. The {g.guaranteeDays}-day guarantee applies when concerns are
              reported within the first {g.reportWindowDays} days.
            </li>
            <li>
              Specimens over {formatMoney(g.highValueVideoThreshold)} require a 15-second
              out-of-water unboxing video.
            </li>
            <li>Shipping costs are non-refundable; replacement shipping is the customer&apos;s.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6">
          <h2 className="text-xl font-bold text-slate-100">Order cancellations</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>
              Cancel before shipment for <strong>1-year store credit in full</strong>, or a
              refund to your payment method <strong>minus a {g.cancellationFeePct}% restocking
              fee</strong>.
            </li>
            <li>WYSIWYG specimens carry the same {g.cancellationFeePct}% fee — that exact animal was reserved for you.</li>
            <li>Store credit is a prepaid balance and can&apos;t be applied retroactively to past orders.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6">
          <h2 className="text-xl font-bold text-slate-100">Dry goods &amp; merchandise</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>Unopened, unused dry goods may be returned within 30 days of delivery for a refund (return shipping on the customer).</li>
            <li>Opened equipment with a defect goes through the manufacturer&apos;s warranty first — we&apos;ll help you file it.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6">
          <h2 className="text-xl font-bold text-slate-100">How refunds are issued</h2>
          <p className="mt-3 text-sm">
            Approved refunds go back to the original payment method and typically appear in
            5–10 business days. Store credit posts to your account instantly. Every refund
            comes with an emailed refund receipt (also downloadable from your{" "}
            <Link href="/account/orders" className="text-reef-400 underline">order history</Link>).
          </p>
        </section>
      </div>

      <div className="mt-8 rounded-2xl border border-reef-500/30 bg-reef-500/5 p-6 text-center">
        <p className="font-semibold text-slate-200">Need to start a claim or cancellation?</p>
        <Link
          href="/account/support"
          className="mt-3 inline-block rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
        >
          Open a support ticket →
        </Link>
      </div>
    </div>
  );
}
