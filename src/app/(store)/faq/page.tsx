import type { Metadata } from "next";
import Link from "next/link";
import { getGuaranteeSettings, getShippingSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about AquaVida365 shipping, the live-arrival guarantee, Reef Points, and ordering.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const [shipping, guarantee] = await Promise.all([
    getShippingSettings(),
    getGuaranteeSettings(),
  ]);

  const faqs: { section: string; items: [string, React.ReactNode][] }[] = [
    {
      section: "Shipping",
      items: [
        [
          "How much is shipping?",
          <>Overnight shipping is {formatMoney(shipping.overnightRate)} (up to {shipping.maxBoxWeightLbs} lbs),
          {" "}{formatMoney(shipping.inStateRate)} within {shipping.homeState}, and{" "}
          <strong>free over {formatMoney(shipping.freeShippingThreshold)}</strong>. Local pickup is free by appointment.</>,
        ],
        [
          "When do orders ship?",
          <>{shipping.shipDaysNote}. Orders placed after the weekly cutoff ship the following
          week. You&apos;ll get an email with tracking the moment your label prints.</>,
        ],
        [
          "Where do you ship?",
          <>{shipping.allowedStatesNote} Alaska is possible only via customer-arranged
          UPS/FedEx pickup.</>,
        ],
        [
          "Can you hold my order?",
          <>Yes — corals up to {guarantee.coralHoldDays} days, fish up to{" "}
          {guarantee.fishHoldBusinessDays} business days. Add a note at checkout or open a
          support ticket with your preferred delivery date.</>,
        ],
        [
          "Do I need to be home for delivery?",
          <>Yes. Live animals can&apos;t sit on a porch. Someone must be present on the
          delivery date — the guarantee&apos;s claim window starts at delivery.</>,
        ],
      ],
    },
    {
      section: "Live-Arrival Guarantee",
      items: [
        [
          "What does the guarantee cover?",
          <>Live arrival, plus a {guarantee.guaranteeDays}-day survival guarantee when the
          package arrived on time and the animal was properly acclimated into a cycled,
          compatible tank. Full conditions on the{" "}
          <Link href="/guarantee" className="text-reef-400 underline">guarantee page</Link>.</>,
        ],
        [
          "How do I file a DOA claim?",
          <>Film the unopened bag and all sides of the box within{" "}
          {guarantee.doaVideoWindowHours} hours of delivery, then open a support ticket with
          the videos and your order number. Step-by-step:{" "}
          <Link href="/learn/how-to-file-doa-claim" className="text-reef-400 underline">
            claim guide</Link>.</>,
        ],
        [
          "What if something dies a few days in?",
          <>Report any concern by email/ticket within the first {guarantee.reportWindowDays}{" "}
          days — early reports keep the full {guarantee.guaranteeDays}-day guarantee active.
          After day {guarantee.reportWindowDays} with no report, claims can&apos;t be honored.</>,
        ],
        [
          "Are there video requirements for expensive specimens?",
          <>Specimens over {formatMoney(guarantee.highValueVideoThreshold)} need a
          15-second out-of-water video during unboxing.</>,
        ],
      ],
    },
    {
      section: "Orders & Payment",
      items: [
        [
          "Can I cancel my order?",
          <>Yes — cancellations receive 1-year store credit, or a refund minus a{" "}
          {guarantee.cancellationFeePct}% restocking fee. WYSIWYG cancellations carry the
          same fee since that specimen was held for you.</>,
        ],
        [
          "What are Reef Points?",
          <>Our loyalty program: 1 point per $1 spent, 100 points = $1 at checkout, plus
          points for reviews (50) and referrals (500). See{" "}
          <Link href="/account/rewards" className="text-reef-400 underline">your rewards page</Link>.</>,
        ],
        [
          "Do you sell gift cards?",
          <>Yes — digital gift cards from the{" "}
          <Link href="/gift-cards" className="text-reef-400 underline">gift card page</Link>,
          delivered by email, never expire.</>,
        ],
        [
          "What does WYSIWYG mean?",
          <>&ldquo;What you see is what you get&rdquo; — the listing photo is the exact
          specimen you&apos;ll receive, photographed in our tanks. There&apos;s exactly one,
          so it&apos;s removed from the shop the moment it sells.</>,
        ],
      ],
    },
    {
      section: "Livestock & Care",
      items: [
        [
          "How should I acclimate new arrivals?",
          <>Temperature float, then drip acclimation for fish and inverts; dip and inspect
          corals. Full walkthrough in the{" "}
          <Link href="/learn/acclimation-guide" className="text-reef-400 underline">
            acclimation guide</Link>.</>,
        ],
        [
          "Are your corals pest-free?",
          <>Everything is dipped and inspected before shipping. We still recommend your own
          dip on arrival — see{" "}
          <Link href="/learn/coral-dipping-101" className="text-reef-400 underline">
            Coral Dipping 101</Link>.</>,
        ],
        [
          "Can you source something specific?",
          <>Often, yes. Text us or open a ticket with the species you&apos;re after and
          we&apos;ll check our supplier network.</>,
        ],
      ],
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.flatMap((s) =>
      s.items.map(([q]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: "See aquavida365 FAQ page." },
      })),
    ),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-center font-[family-name:var(--font-display)] text-4xl font-extrabold">
        Frequently Asked <span className="text-gradient">Questions</span>
      </h1>
      <p className="mt-3 text-center text-slate-400">
        Can&apos;t find it here? <Link href="/contact" className="text-reef-400 underline">Contact us</Link>{" "}
        — we answer fast.
      </p>

      {faqs.map((group) => (
        <section key={group.section} className="mt-10">
          <h2 className="text-xl font-bold text-slate-100">{group.section}</h2>
          <div className="mt-4 space-y-3">
            {group.items.map(([q, a]) => (
              <details
                key={q}
                className="group rounded-xl border border-abyss-700/60 bg-abyss-900 open:border-reef-500/40"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 font-medium text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-reef-400 transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <div className="px-5 pb-4 text-sm leading-relaxed text-slate-400">{a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
